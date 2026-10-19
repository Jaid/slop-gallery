import {describe, expect, test} from 'bun:test'

import {BoxGeometry, CylinderGeometry, MeshPhysicalNodeMaterial, Vector3} from 'three/webgpu'

import createSupportGeometry from '../../src/components/levels/knottingham/KnotLabels/supportGeometry.ts'
import SlattedBenchGeometry from '../../src/lib/gallery/fountain/SlattedBenchGeometry.ts'
import BrushedMetalMaterial, {metalReflectance, unlitMetal} from '../../src/lib/materials/metal/BrushedMetalMaterial.ts'
import {geometryGrain, setGrain} from '../../src/lib/materials/metal/grain.ts'
import knottinghamSurroundings from '../../src/lib/materials/metal/knottinghamRoom.ts'
import {surroundings} from '../../src/lib/materials/metal/rooms.ts'
import {SurroundingsNode} from '../../src/lib/materials/metal/Surroundings.ts'

const metalUsers = {
  'src/components/levels/gallery/FountainBenches/index.tsx': 'surroundings.lobby',
  'src/components/levels/gallery/OculusRailings/index.tsx': 'surroundings.oculus',
  'src/lib/materials/SignMetalMaterial.ts': 'knottinghamSurroundings',
}
const readGrain = (geometry: {getAttribute: (name: string) => {
  count: number
  getW: (index: number) => number
  getX: (index: number) => number
  getY: (index: number) => number
  getZ: (index: number) => number
}}, index: number) => {
  const axis = geometry.getAttribute('grainAxis')
  return {
    axis: new Vector3(axis.getX(index), axis.getY(index), axis.getZ(index)),
    turned: axis.getW(index) === 1,
  }
}
describe('brushed metal', () => {
  test('is fully metallic, anisotropic along its grain and mirrors its own room instead of the scene’s environment', () => {
    const material = new BrushedMetalMaterial({
      surroundings: surroundings.lobby,
      grain: geometryGrain,
    })
    try {
      expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial)
      expect(material.metalness).toBe(1)
      expect(material.envNode).toBeInstanceOf(SurroundingsNode)
      expect(material.anisotropyNode).not.toBeNull()
      expect(material.useAnisotropy).toBe(true)
      expect(material.normalNode).not.toBeNull()
      expect(material.roughnessNode).not.toBeNull()
      expect(material.colorNode).not.toBeNull()
    } finally {
      material.dispose()
    }
  })
  test('without a grain it is evenly polished', () => {
    const material = new BrushedMetalMaterial({surroundings: surroundings.oculus})
    try {
      expect(material.grain).toBeNull()
      expect(material.anisotropyNode).toBeNull()
      expect(material.useAnisotropy).toBe(false)
    } finally {
      material.dispose()
    }
  })
  test('the unlit counterpart mirrors the room on a plain color', () => {
    const material = unlitMetal({surroundings: knottinghamSurroundings})
    try {
      expect(material.type).toBe('MeshBasicNodeMaterial')
      expect(material.colorNode).not.toBeNull()
    } finally {
      material.dispose()
    }
  })
  test('stainless steel reflects a neutral, slightly warm gray well below white', () => {
    const [red, , blue] = metalReflectance.stainless
    expect(red).toBeGreaterThan(blue)
    expect(red - blue).toBeLessThan(0.1)
    expect(red).toBeLessThan(0.7)
    expect(blue).toBeGreaterThan(0.5)
  })
  test('the bench frames, Oculus railings and nameplate stands mirror the room they stand in', async () => {
    for (const [file, room] of Object.entries(metalUsers)) {
      const source = await Bun.file(file).text()
      expect(source, file).toContain('BrushedMetalMaterial')
      expect(source, file).toContain(room)
    }
  })
})
describe('the mirrored rooms', () => {
  test('have the ceiling above the floor, walls around the metal and lights brighter than the ceiling', () => {
    for (const [name, room] of Object.entries({
      ...surroundings,
      knottingham: knottinghamSurroundings,
    })) {
      expect(room.ceiling.height, name).toBeGreaterThan(2.4)
      expect(room.walls.distance, name).toBeGreaterThan(2)
      expect(room.walls.accents.length, name).toBeGreaterThan(0)
      expect(room.floor.tile, name).toBeGreaterThan(0)
      expect(room.ceiling.lights.intensity, name).toBeGreaterThan(1)
      for (const axis of [0, 1]) {
        expect(room.ceiling.lights.size[axis], name).toBeLessThanOrEqual(room.ceiling.lights.spacing[axis])
      }
    }
  })
  test('sit at the floors of their levels', () => {
    expect(surroundings.lobby.floor.y).toBe(0)
    expect(knottinghamSurroundings.floor.y).toBe(0)
    expect(surroundings.oculus.floor.y).toBe(-8)
  })
})
describe('grain', () => {
  test('marks every vertex of a part with a unit axis and its kind', () => {
    const box = setGrain(new BoxGeometry(1, 2, 3), {
      kind: 'brushed',
      axis: [0, 4, 0],
    })
    const disc = setGrain(new CylinderGeometry(0.2, 0.2, 0.03, 16), {
      kind: 'turned',
      axis: [0, 1, 0],
      center: [0.3, 0, -0.1],
    })
    try {
      expect(box.getAttribute('grainAxis').count).toBe(box.getAttribute('position').count)
      expect(readGrain(box, 3).axis.toArray()).toEqual([0, 1, 0])
      expect(readGrain(box, 3).turned).toBe(false)
      expect(readGrain(disc, 0).turned).toBe(true)
      expect([...disc.getAttribute('grainCenter').array.slice(0, 3)].map(value => Math.round(value * 1000) / 1000)).toEqual([0.3, 0, -0.1])
    } finally {
      box.dispose()
      disc.dispose()
    }
  })
  test('can follow a bending part vertex by vertex, and rejects axes without a direction', () => {
    const box = setGrain(new BoxGeometry(1, 1, 1), vertex => ({
      kind: 'brushed',
      axis: vertex % 2 ? [1, 0, 0] : [0, 0, 2],
    }))
    try {
      expect(readGrain(box, 0).axis.toArray()).toEqual([0, 0, 1])
      expect(readGrain(box, 1).axis.toArray()).toEqual([1, 0, 0])
      expect(() => setGrain(new BoxGeometry, {
        kind: 'brushed',
        axis: [0, 0, 0],
      })).toThrow(RangeError)
    } finally {
      box.dispose()
    }
  })
  test('survives merging: the bench frame is brushed along its legs and rails, its screws are turned', () => {
    const bench = new SlattedBenchGeometry
    try {
      const grain = bench.metal.getAttribute('grainAxis')
      const kinds = new Set<string>
      for (let index = 0; index < grain.count; index++) {
        const {axis, turned} = readGrain(bench.metal, index)
        expect(axis.length()).toBeCloseTo(1, 5)
        kinds.add(`${turned ? 'turned' : 'brushed'} ${axis.toArray().map(Math.round).join(',')}`)
      }
      expect([...kinds].toSorted()).toEqual(['brushed 0,0,1', 'brushed 0,1,0', 'turned 0,1,0'])
    } finally {
      bench.dispose()
    }
  })
  test('the nameplate stand has a brushed stem and plaque and turned round parts', () => {
    const geometry = createSupportGeometry()
    try {
      const grain = geometry.getAttribute('grainAxis')
      expect(grain.count).toBe(geometry.getAttribute('position').count)
      let turned = 0
      for (let index = 0; index < grain.count; index++) {
        turned += readGrain(geometry, index).turned ? 1 : 0
      }
      expect(turned).toBeGreaterThan(0)
      expect(turned).toBeLessThan(grain.count)
    } finally {
      geometry.dispose()
    }
  })
})
