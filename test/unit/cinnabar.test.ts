import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {DoubleSide, Matrix3, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallFace, wallOpeningTrim} from '../../src/lib/gallery/architecture.ts'
import {bastionApproach, bastionArch} from '../../src/lib/gallery/bastion.ts'
import cinnabar, {cinnabarFresco, cinnabarRooflight, cinnabarTerrazzo, cinnabarVestibule, frescoLayout, isRing} from '../../src/lib/gallery/cinnabar.ts'
import {cinnabarRoundVestibule, cinnabarVestibuleFloor, vestibuleArches} from '../../src/lib/gallery/cinnabarVestibule.ts'
import roomOrigins from '../../src/lib/gallery/layout.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import roundRevealGeometry from '../../src/lib/gallery/roundRevealGeometry.ts'
import {roundVestibuleFloorShape} from '../../src/lib/gallery/roundVestibule.ts'
import salon, {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {vesper} from '../../src/lib/gallery/vesper.ts'
import CinnabarWallMaterial from '../../src/lib/materials/CinnabarWallMaterial.ts'
import TerrazzoFloorMaterial, {blackTerrazzo, venetianTerrazzo} from '../../src/lib/materials/TerrazzoFloorMaterial.ts'
import {insideOpening, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import {openings} from '../../src/worlds/gallery/relations.ts'
import walls, {floorHeight, insideGallery, roomAt, rooms, roomVisit} from './fixtures/gallery.ts'

await RAPIER.init()
const room = rooms.find(candidate => candidate.id === 'cinnabar')!
const wallById = (id: string) => walls.find(wall => wall.id === id)!
/** the positions sorted and rounded to micrometers, for comparing layouts */
const rounded = (list: ReadonlyArray<number>) => list.toSorted((a, b) => a - b).map(at => Math.round(at * 1e6) + 0)
describe('the Cinnabar', () => {
  test('mirrors the Salon across the Lobby’s north extension, north of the Vesper, which mirrors the Banquet', () => {
    const salonRoom = rooms.find(candidate => candidate.id === 'salon')!
    const vesperRoom = rooms.find(candidate => candidate.id === 'vesper')!
    const banquet = rooms.find(candidate => candidate.id === 'banquet')!
    expect(room.floorY).toBe(0)
    expect(room.center).toEqual([-salonRoom.center[0], salonRoom.center[1]])
    expect(room.size).toEqual(salonRoom.size)
    expect(cinnabar.size).toEqual(salon.size)
    expect(vesperRoom.center).toEqual([-banquet.center[0], banquet.center[1]])
    expect(vesperRoom.size).toEqual(banquet.size)
    expect(vesper.size).toEqual([12, 24])
    expect(roomOrigins.vesper).toEqual([-14, 0, -4])
    // Against the Lobby’s west extension, with the Vesper south of it
    expect(room.center[0] + room.size[0] / 2).toBe(-8)
    expect(room.center[1] + room.size[1] / 2).toBe(vesperRoom.center[1] - vesperRoom.size[1] / 2)
    for (const [x, z] of [[-8.5, -19.5], [-19.5, -16.5], [-14, -24], [-8.5, -31.5], [-19.5, -31.5]]) {
      expect(roomAt([x, 1.7, z])).toBe('cinnabar')
      expect(floorHeight([x, 1.7, z])).toBe(0)
    }
    expect(roomAt([-14, 1.7, -12])).toBe('vesper')
    // Behind its north wall lies its round vestibule, in the middle; beside that, nothing.
    expect(roomAt([-14, 1.7, -32.5])).toBe('cinnabar')
    expect(insideGallery([-18, 1.7, -32.5])).toBe(false)
    expect(roomAt(roomVisit(room).position)).toBe('cinnabar')
  })
  test('a solid shared wall separates the Vesper and the Cinnabar', () => {
    const vesperNorth = wallById('vesper-north')
    const cinnabarSouth = wallById('cinnabar-south')
    expect(vesperNorth.center).toEqual(cinnabarSouth.center)
    expect(Math.abs(Math.cos(vesperNorth.rotation - cinnabarSouth.rotation) + 1)).toBeLessThan(1e-12)
    for (const wall of [vesperNorth, cinnabarSouth]) {
      expect(wall.holes ?? []).toHaveLength(0)
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial({side: DoubleSide})
      const world = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      try {
        const mesh = new Mesh(geometry.surface, material)
        for (const [vertices, indices] of geometry.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
        }
        world.step()
        for (const y of [0.5, 1.7, 3.5]) {
          for (const side of [-1, 1]) {
            const origin = new Vector3(0, y, side)
            const direction = new Vector3(0, 0, -side)
            const ray = new Raycaster(origin, direction, 0, 2)
            expect(ray.intersectObject(mesh).length).toBeGreaterThan(0)
            expect(world.castRay(new RAPIER.Ray(origin, direction), 2, true)).not.toBeNull()
          }
        }
      } finally {
        world.free()
        geometry.dispose()
        material.dispose()
      }
    }
    expect(openings.some(({rooms: pair}) => pair.includes('vesper') && pair.includes('cinnabar'))).toBe(false)
    expect(roomAt([-14, 1.7, -15.9])).toBe('vesper')
    expect(roomAt([-14, 1.7, -16.1])).toBe('cinnabar')
    // The Vesper keeps its doors to the Lobby and the Sienna.
    const vesperEast = wallById('vesper-east')
    expect(vesperEast.holes).toHaveLength(1)
    expect(insideOpening(vesperEast.holes![0], wallCoordinates(vesperEast, [-8, 0, lobby.sideDoorZ]), 1.7)).toBe(true)
    const vesperSouth = wallById('vesper-south')
    expect(insideOpening(vesperSouth.holes![0], wallCoordinates(vesperSouth, [-10.2, 0, 8]), 1.7)).toBe(true)
    expect(roomAt([-14, 1.7, 7.9])).toBe('vesper')
  })
  test('the rooflight is a round opening in whole panes, inside the room, under its slab, within the sun’s reach', () => {
    const {bead, depth, frame, glassY, pane, radius} = cinnabarRooflight
    expect(radius * 2 / pane % 1).toBeCloseTo(0, 9)
    expect(radius + frame).toBeLessThan(Math.min(...room.size) / 2 - 1)
    expect(glassY).toBeLessThan(salonCeiling.underside)
    expect(salonCeiling.underside - depth - bead).toBeGreaterThan(5)
    expect(room.room.sunlit).toBe(true)
    expect(room.room.hasVolumetricSun).toBe(true)
  })
  test('the fresco lays its bands and panels out around each wall’s doorways, a band flanking every doorway and every panel framed but the pierced ones', () => {
    const {band, openingMargin, panelLength, socle, frieze} = cinnabarFresco
    expect(frieze[1]).toBeLessThan(5.5 - 0.47)
    expect(socle).toBeGreaterThan(0.44)
    for (const id of ['north', 'east', 'south', 'west']) {
      const wall = wallById(`cinnabar-${id}`)
      const {bands, panels} = frescoLayout(wall)
      const end = wall.width / 2 - wallFace
      // Panels tile the wall face from corner to corner, a band between any two of them, each about a panel long unless a doorway stands in it.
      expect(panels[0].u[0]).toBeCloseTo(-end, 9)
      expect(panels.at(-1)!.u[1]).toBeCloseTo(end, 9)
      for (const [index, panel] of panels.entries()) {
        if (index) {
          const gap = panel.u[0] - panels[index - 1].u[1]
          expect(gap).toBeCloseTo(band, 9)
          expect(bands.some(at => Math.abs(at - (panel.u[0] - band / 2)) < 1e-9)).toBe(true)
        }
        if (panel.pierced) {
          continue
        }
        expect(panel.u[1] - panel.u[0]).toBeGreaterThan(panelLength * 0.6)
        expect(panel.u[1] - panel.u[0]).toBeLessThan(panelLength * 1.5)
      }
      expect(bands).toHaveLength(panels.length - 1)
      // Bands are symmetric about the wall’s middle, and stand off the doorways’ casings by the margin.
      expect(rounded(bands.map(at => -at))).toEqual(rounded(bands))
      for (const hole of wall.holes ?? []) {
        const pierced = panels.find(panel => panel.pierced && panel.u[0] < hole.u && hole.u < panel.u[1])!
        expect(pierced).toBeDefined()
        expect(pierced.u[0]).toBeCloseTo(hole.u - hole.width / 2 - wallOpeningTrim - openingMargin, 9)
        expect(pierced.u[1]).toBeCloseTo(hole.u + hole.width / 2 + wallOpeningTrim + openingMargin, 9)
      }
      expect(panels.filter(panel => panel.pierced)).toHaveLength(wall.holes?.length ?? 0)
    }
    // One panel on either side of the arch on the north wall, three across the blank south wall and four down the east and west walls.
    expect(frescoLayout(wallById('cinnabar-north')).panels).toHaveLength(3)
    expect(frescoLayout(wallById('cinnabar-north')).period).toBeUndefined()
    expect(frescoLayout(wallById('cinnabar-east')).panels).toHaveLength(4)
    expect(frescoLayout(wallById('cinnabar-south')).panels.map(panel => panel.pierced)).toEqual([false, false, false])
    expect(frescoLayout(wallById('cinnabar-west')).panels).toHaveLength(4)
  })
  test('its materials build their surface nodes', () => {
    const wall = new CinnabarWallMaterial(frescoLayout(wallById('cinnabar-south')))
    try {
      for (const node of [wall.colorNode, wall.roughnessNode, wall.normalNode]) {
        expect(node?.isNode).toBe(true)
      }
    } finally {
      wall.dispose()
    }
    for (const reflections of [true, false]) {
      const floor = new TerrazzoFloorMaterial({
        center: room.center,
        size: room.size,
        field: venetianTerrazzo,
        border: blackTerrazzo,
        inset: cinnabarTerrazzo.border,
        reflections,
      })
      try {
        for (const node of [floor.colorNode, floor.roughnessNode, floor.normalNode]) {
          expect(node?.isNode).toBe(true)
        }
        expect(Boolean(floor.reflection)).toBe(reflections)
        expect(floor.mirrored.value).toBe(1)
      } finally {
        floor.dispose()
      }
    }
    // The Cinnabar’s polish mirrors as strongly and clearly as the Banquet’s marble.
    const polished = new TerrazzoFloorMaterial({
      center: room.center,
      size: room.size,
      field: venetianTerrazzo,
      border: blackTerrazzo,
      inset: cinnabarTerrazzo.border,
      reflections: true,
      strength: 0.4,
      grazingStrength: 0.2,
      loss: 0,
      roughness: 0.1,
    })
    try {
      expect(polished.reflection).not.toBeNull()
      expect(polished.reflectionTarget).not.toBeNull()
      expect(polished.roughness).toBe(0.1)
    } finally {
      polished.dispose()
    }
    expect(() => new TerrazzoFloorMaterial({
      center: [0, 0],
      size: [0, 1],
      field: venetianTerrazzo,
    })).toThrow(RangeError)
    // The border lies inside the brass inlays, which every stone floor lays 1.25 m from the walls.
    expect(cinnabarTerrazzo.border).toBe(1.25)
  })
})
describe('the Cinnabar’s vestibule', () => {
  const {center: [x, z], radius, rooflight} = cinnabarVestibule
  const ring = wallById('cinnabar-vestibule')
  const north = wallById('cinnabar-north')
  const northZ = cinnabar.center[1] - cinnabar.size[1] / 2
  const half = bastionArch.width / 2
  const archOf = (name: string) => ring.holes!.find(hole => hole.name === name)!
  test('is round, on the room’s axis, its wall touching the middle of the north wall back to back, where an arch opens through both', () => {
    expect(x).toBe(cinnabar.center[0])
    expect(z + radius).toBe(northZ)
    expect(isRing(ring)).toBe(true)
    expect(isRing(north)).toBe(false)
    expect([ring.curveRadius, ring.height, ring.room, ring.sticky]).toEqual([radius, north.height, 'cinnabar', false])
    // All round its center at its radius, facing it
    for (let u = -ring.width / 2; u <= ring.width / 2; u += 0.5) {
      const [px, , pz] = wallPosition(ring, u, 0, 0)
      const [fx, , fz] = wallPosition(ring, u, 0, 1)
      expect(Math.hypot(px - x, pz - z)).toBeCloseTo(radius, 9)
      expect(Math.hypot(fx - x, fz - z)).toBeCloseTo(radius - 1, 9)
    }
    // Where they touch, one faces north into the vestibule and the other south into the room, each with the approach’s arch in it.
    const inner = archOf('cinnabar')
    const outer = north.holes!.find(hole => hole.name === 'vestibule')!
    expect(outer).toMatchObject(bastionArch)
    for (const [wall, hole, facing] of [[ring, inner, -1], [north, outer, 1]] as const) {
      const [px, , pz] = wallPosition(wall, hole.u, 0, 0)
      expect(px).toBeCloseTo(x, 9)
      expect(pz).toBeCloseTo(northZ, 9)
      expect(wallPosition(wall, hole.u, 0, 0.5)[2]).toBeCloseTo(northZ + facing * 0.5, 9)
    }
    // Both arches of the ring span as much straight across between their jambs as the approach’s arch, and stand as high.
    expect(ring.holes!.map(hole => hole.name)).toEqual(vestibuleArches.map(arch => arch.name))
    for (const hole of ring.holes!) {
      const [left, right] = [-1, 1].map(side => wallPosition(ring, hole.u + side * hole.width / 2, 0, 0))
      expect(Math.hypot(left[0] - right[0], left[2] - right[2])).toBeCloseTo(bastionArch.width, 9)
      expect([hole.height, hole.profile, hole.bottom]).toEqual([bastionArch.height, bastionArch.profile, undefined])
    }
    // The west one where the approach ends, the arch between the room and the vestibule within the room.
    const [wx, , wz] = wallPosition(ring, archOf('fortress').u, 0, 0)
    expect(wx).toBeCloseTo(bastionApproach.path.at(-1)![0], 9)
    expect(wz).toBeCloseTo(bastionApproach.path.at(-1)![1], 9)
    expect(openings.filter(({rooms: pair}) => pair.includes('cinnabar'))).toEqual([{
      rooms: ['fortress', 'cinnabar'],
      holes: [['cinnabar-vestibule', 'fortress']],
    }])
  })
  test('navigation holds its round floor and its thresholds out under its arches, and nothing else behind its wall', () => {
    for (const [dx, dz] of [[0, 0], [2.6, 0], [-2.6, 0], [0, -2.9], [0, 2.9], [2, -2], [-2, 2]]) {
      const position = [x + dx, 1.7, z + dz] as const
      expect(roomAt([...position])).toBe('cinnabar')
      expect(floorHeight([...position])).toBe(0)
      expect(insideGallery([...position])).toBe(true)
    }
    // Under the west arch, outside the wall’s center line, out to where the approach ends, as wide as it
    for (const along of [radius - 0.01, radius]) {
      expect(cinnabarVestibuleFloor(x - along, z + half - 0.01)).toBe(0)
      expect(cinnabarVestibuleFloor(x - along, z - half + 0.01)).toBe(0)
      expect(cinnabarVestibuleFloor(x - along, z + half + 0.05)).toBeUndefined()
    }
    expect(cinnabarVestibuleFloor(x - radius - 0.05, z)).toBeUndefined()
    expect(cinnabarVestibuleFloor(x + half - 0.01, northZ)).toBe(0)
    // Behind the wall, in the corners of its box, lies nothing.
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      expect(insideGallery([x + dx * (radius - 0.4), 1.7, z + dz * (radius - 0.4)])).toBe(false)
    }
    // Under its floor, the Fortress’ curve climbs west toward the Lodge.
    expect(roomAt([x, -4.4, z - 2.7])).toBe('fortress')
    expect(insideGallery([x, 6.2, z])).toBe(false)
  })
  test('its floor slab’s shape is what navigation holds: within the wall’s center line and out under each arch to the plane touching it', () => {
    // In the shape’s plane, y runs north.
    const outline = roundVestibuleFloorShape(cinnabarRoundVestibule).getPoints(256)
    const contains = (px: number, py: number) => {
      let inside = false
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const [a, b] = [outline[i], outline[j]]
        if (a.y > py !== b.y > py && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) {
          inside = !inside
        }
      }
      return inside
    }
    let compared = 0
    for (let dx = -radius - 0.3; dx <= radius + 0.3; dx += 0.07) {
      for (let dz = -radius - 0.3; dz <= radius + 0.3; dz += 0.07) {
        // Right on the wall’s center line, the shape’s chords cut the corners.
        if (Math.abs(Math.hypot(dx, dz) - radius) < 0.01) {
          continue
        }
        expect(`${dx.toFixed(2)}, ${dz.toFixed(2)}: ${contains(dx, -dz)}`).toBe(`${dx.toFixed(2)}, ${dz.toFixed(2)}: ${cinnabarVestibuleFloor(x + dx, z + dz) !== undefined}`)
        compared++
      }
    }
    expect(compared).toBeGreaterThan(5000)
  })
  test('the reveals line its arches from its wall’s center line out to the plane touching it there, round the jambs and the head, but not the sill', () => {
    const place = new Matrix4
    place.makeRotationY(ring.rotation).setPosition(...ring.center)
    const turn = new Matrix3
    turn.setFromMatrix4(place)
    for (const {name, angle} of vestibuleArches) {
      const hole = archOf(name)
      const reveal = roundRevealGeometry(ring, hole, bastionArch)
      try {
        const position = reveal.getAttribute('position')
        const normal = reveal.getAttribute('normal')
        const point = new Vector3
        const facing = new Vector3
        const out = [Math.cos(angle), Math.sin(angle)] as const
        let widest = 0
        let highest = 0
        for (let i = 0; i < position.count; i++) {
          point.fromBufferAttribute(position, i).applyMatrix4(place)
          facing.fromBufferAttribute(normal, i).applyMatrix3(turn)
          const [dx, dz] = [point.x - x, point.z - z]
          const along = dx * out[0] + dz * out[1]
          const across = dz * out[0] - dx * out[1]
          // Never in front of the wall’s center line or past the plane, nor wider or higher than the approach’s arch
          expect(Math.hypot(dx, dz)).toBeGreaterThan(radius - 1e-6)
          expect(along).toBeLessThan(radius + 1e-6)
          expect(Math.abs(across)).toBeLessThan(half + 1e-6)
          expect(point.y).toBeGreaterThanOrEqual(-1e-9)
          expect(point.y).toBeLessThan(bastionArch.height + 1e-6)
          // Facing into the opening: straight across it below where the head springs, toward the middle of the head above, and never along it
          const sideways = facing.z * out[0] - facing.x * out[1]
          const springY = bastionArch.height - half
          expect(sideways * -across + facing.y * (Math.min(point.y, springY) - point.y)).toBeGreaterThan(0)
          expect(Math.abs(facing.x * out[0] + facing.z * out[1])).toBeLessThan(1e-6)
          if (Math.abs(along - radius) >= 1e-6) {
            continue
          }
          widest = Math.max(widest, Math.abs(across))
          highest = Math.max(highest, point.y)
        }
        // Out at the plane, it opens as wide and as high as the approach’s arch.
        expect(widest).toBeCloseTo(half, 6)
        expect(highest).toBeCloseTo(bastionArch.height, 6)
        const [, indices] = colliderGeometry(reveal)
        expect(indices.length).toBeGreaterThan(0)
      } finally {
        reveal.dispose()
      }
    }
  })
  test('its wall is frescoed all round without a corner, its panels running on through the seam where its ends meet', () => {
    const {band, openingMargin, panelLength} = cinnabarFresco
    const {bands, panels, period} = frescoLayout(ring)
    expect(period).toBeCloseTo(ring.width, 9)
    for (const at of [...bands, ...panels.map(panel => panel.u[0])]) {
      expect(Math.abs(at)).toBeLessThanOrEqual(period! / 2 + 1e-9)
    }
    // Round the ring, panels and bands take turns, as many of each.
    expect(bands).toHaveLength(panels.length)
    const wrap = (u: number) => u - period! * Math.floor(u / period!)
    const starts = panels.toSorted((a, b) => wrap(a.u[0]) - wrap(b.u[0]))
    for (const [index, panel] of starts.entries()) {
      const next = starts[(index + 1) % starts.length]
      const gap = wrap(next.u[0] - panel.u[1])
      expect(gap).toBeCloseTo(band, 9)
      expect(bands.some(at => Math.abs(wrap(at - panel.u[1] - band / 2 + period! / 2) - period! / 2) < 1e-9)).toBe(true)
    }
    // A bay round each arch, as wide as in the room; one narrow panel between both arches, and round the far side three of about a panel’s length.
    for (const hole of ring.holes!) {
      const bay = panels.find(panel => panel.pierced && Math.abs(wrap((panel.u[0] + panel.u[1]) / 2 - hole.u + period! / 2) - period! / 2) < 1e-9)!
      expect(bay.u[1] - bay.u[0]).toBeCloseTo(hole.width + (wallOpeningTrim + openingMargin) * 2, 9)
    }
    const plain = panels.filter(panel => !panel.pierced).map(panel => panel.u[1] - panel.u[0]).toSorted((a, b) => a - b)
    expect(plain).toHaveLength(4)
    expect(plain[0]).toBeLessThan(panelLength / 2)
    for (const length of plain.slice(1)) {
      expect(length).toBeCloseTo(plain[1], 9)
      expect(length).toBeGreaterThan(panelLength * 0.6)
      expect(length).toBeLessThan(panelLength * 1.5)
    }
    const material = new CinnabarWallMaterial({
      ...frescoLayout(ring),
      curveRadius: ring.curveRadius,
    })
    try {
      for (const node of [material.colorNode, material.roughnessNode, material.normalNode]) {
        expect(node?.isNode).toBe(true)
      }
    } finally {
      material.dispose()
    }
  })
  test('its ceiling’s rooflight is a round opening in whole panes, well inside its wall, under its slab, and its terrazzo borders the round wall', () => {
    const {bead, depth, frame, glassY, pane} = rooflight
    expect(rooflight.radius * 2 / pane % 1).toBeCloseTo(0, 9)
    expect(rooflight.radius + frame).toBeLessThan(radius - 1)
    expect(glassY).toBeLessThan(salonCeiling.underside)
    expect(salonCeiling.underside - depth - bead).toBeGreaterThan(5)
    const floor = new TerrazzoFloorMaterial({
      center: cinnabarVestibule.center,
      radius,
      field: venetianTerrazzo,
      border: blackTerrazzo,
      inset: cinnabarTerrazzo.border,
      reflections: true,
    })
    try {
      for (const node of [floor.colorNode, floor.roughnessNode, floor.normalNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(floor.reflectionTarget).not.toBeNull()
    } finally {
      floor.dispose()
    }
    expect(() => new TerrazzoFloorMaterial({
      center: [0, 0],
      radius: 0,
      field: venetianTerrazzo,
    })).toThrow(RangeError)
  })
})
