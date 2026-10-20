import {expect, test} from 'bun:test'

import {AmbientLight, DirectionalLight, HemisphereLight, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, PointLight, StandardNodeLibrary} from 'three/webgpu'

import {corridorPassage} from '../../src/lib/gallery/corridor.ts'
import {lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import {GlobeBody, LanternBody} from '../../src/lib/gallery/pendants/index.ts'
import {soleLampBounce, soleLampReach} from '../../src/lib/gallery/pendants/lighting.ts'
import {corridorLightSpacing, passageLightHeight, passagePendantMounts} from '../../src/lib/gallery/pendants/mounts.ts'
import {corridorLanterns, IndoorLightsNode, LanternEnvironment, LanternLight, LanternLightNode, LanternLightsNode, lightIndoors, lodgeWindowLights} from '../../src/lib/materials/lights/index.ts'
import {sample} from '../../src/lib/materials/lights/LanternEnvironment.ts'

const lanternBody = new LanternBody
const lamp = (zone: LanternLightsNode) => {
  const light = new LanternLight({
    intensity: soleLampReach.intensity,
    distance: soleLampReach.distance,
    roof: lanternBody.roof,
    bounce: soleLampBounce,
  })
  Object.assign(light.userData, zone.lampUserData())
  return light
}
/** Irradiance a lamp at its passage height sends onto the floor, attenuated like a three.js point light: inverse square, windowed to its cutoff. */
const floorIrradiance = (light: LanternLight, horizontal: number) => {
  const distance = Math.hypot(horizontal, passageLightHeight)
  const window = Math.max(0, 1 - (distance / light.distance) ** 4) ** 2
  const direct = light.intensity * window / distance ** light.decay * (passageLightHeight / distance)
  return direct + light.intensity * light.bounceAt(distance)
}
test('the corridor’s lanterns light only the corridor, and nothing else lights it', () => {
  const lantern = lamp(corridorLanterns)
  const otherZone = lamp(new LanternLightsNode('elsewhere'))
  const indoors = new IndoorLightsNode
  for (const light of [new DirectionalLight, new AmbientLight, new HemisphereLight, new PointLight, otherZone]) {
    expect(corridorLanterns.admits(light)).toBe(false)
  }
  expect(corridorLanterns.admits(lantern)).toBe(true)
  // Lamps cast no shadows, so they must not shine through the corridor’s walls into the Lodge.
  expect(indoors.admits(lantern)).toBe(false)
  expect(indoors.admits(new PointLight)).toBe(true)
  expect(indoors.admits(new DirectionalLight)).toBe(false)
  // The window between both spaces catches the lights of each.
  expect(lodgeWindowLights.admits(lantern)).toBe(true)
  expect(lodgeWindowLights.admits(new PointLight)).toBe(true)
  expect(lodgeWindowLights.admits(new DirectionalLight)).toBe(false)
  expect(lodgeWindowLights.admits(otherZone)).toBe(false)
})
test('adopted materials reflect the lanterns’ darkness instead of the gallery’s sky', () => {
  const wood = corridorLanterns.adopt(new MeshStandardNodeMaterial({envMapIntensity: 0.2}))
  expect(wood.lightsNode).toBe(corridorLanterns)
  expect(wood.envMap).toBe(corridorLanterns.environment)
  expect(wood.envMapIntensity).toBe(1)
  const glass = lodgeWindowLights.adopt(new MeshPhysicalNodeMaterial({envMapIntensity: 1.6}))
  expect(glass.envMap).toBe(corridorLanterns.environment)
  expect(glass.envMapIntensity).toBe(1.6)
  // The Lodge keeps the scene’s environment.
  const lodge = lightIndoors(new MeshStandardNodeMaterial)
  expect(lodge.envMap).toBeNull()
  for (const material of [wood, glass, lodge]) {
    material.dispose()
  }
})
test('the lantern environment is a dim, warm dusk, darkest under the rafters', () => {
  const environment = new LanternEnvironment
  try {
    const {data, width, height} = environment.image as {
      data: Uint8Array
      height: number
      width: number
    }
    expect(data).toHaveLength(width * height * 4)
    // Rows run bottom-up, as three.js uploads data textures without flipping them.
    const row = (index: number) => [...data.subarray(index * width * 4, index * width * 4 + 3)]
    const bottom = row(0)
    const top = row(height - 1)
    for (const [r, g, b] of [bottom, top]) {
      expect(r).toBeGreaterThan(g)
      expect(g).toBeGreaterThan(b)
      expect(r).toBeLessThan(80)
    }
    expect(top[0]).toBeLessThan(bottom[0])
    expect(top).toEqual(sample(1 - (height - 0.5) / height))
    expect(sample(-1)).toEqual(sample(0))
    expect(sample(2)).toEqual(sample(1))
  } finally {
    environment.dispose()
  }
})
test('a fixture’s roof shades the ceiling above it but not the room around and below it', () => {
  for (const body of [new LanternBody, new GlobeBody]) {
    const light = new LanternLight({roof: body.roof})
    expect(light.transmission(-1)).toBe(1)
    expect(light.transmission(0)).toBe(1)
    expect(light.transmission(body.roof.start)).toBe(1)
    expect(light.transmission(1)).toBeCloseTo(body.roof.leak)
    expect(body.roof.leak).toBeGreaterThan(0)
    expect(body.roof.leak).toBeLessThan(0.5)
    // Monotonic between the shade’s start and end.
    let previous = 1
    for (let y = body.roof.start; y <= body.roof.end; y += 0.01) {
      const share = light.transmission(y)
      expect(share).toBeLessThanOrEqual(previous + 1e-12)
      previous = share
    }
  }
})
test('lantern pools fade to a dim gap between neighbors without going black', () => {
  const geometry = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
  try {
    const lamps = passagePendantMounts(corridorPassage, [geometry.shell, geometry.ribs], corridorLightSpacing).map(mount => mount.light)
    const light = lamp(corridorLanterns)
    const floor = (x: number, z: number) => lamps.reduce((sum, [lampX, , lampZ]) => sum + floorIrradiance(light, Math.hypot(x - lampX, z - lampZ)), 0)
    // Along the long span, every pair of neighbors leaves a dimmer stretch between their pools.
    const span = lamps.filter(([x]) => x === corridorPassage.spans[1].start[0])
    expect(span.length).toBe(6)
    for (let i = 1; i < span.length; i++) {
      const [x, , z] = span[i]
      const previous = span[i - 1][2]
      const under = Math.min(floor(x, z), floor(x, previous))
      const between = floor(x, (z + previous) / 2)
      expect(between / under).toBeLessThan(0.5)
      expect(between / under).toBeGreaterThan(0.15)
    }
  } finally {
    geometry.dispose()
  }
})
test('bounce light falls off smoothly and ends at its reach', () => {
  const light = lamp(corridorLanterns)
  let previous = Infinity
  for (let distance = 0; distance <= soleLampBounce.distance + 1; distance += 0.1) {
    const share = light.bounceAt(distance)
    expect(share).toBeGreaterThanOrEqual(0)
    expect(share).toBeLessThanOrEqual(previous)
    previous = share
  }
  expect(light.bounceAt(0)).toBeCloseTo(soleLampBounce.share)
  expect(light.bounceAt(soleLampBounce.distance)).toBe(0)
  const unbounced = new LanternLight
  expect(unbounced.bounceAt(0)).toBe(0)
})
test('lantern lights clone with their roof and bounce, and reject impossible shapes', () => {
  const light = lamp(corridorLanterns)
  const clone = light.clone()
  expect(clone).toBeInstanceOf(LanternLight)
  expect(clone.roof).toEqual(light.roof)
  expect(clone.roof).not.toBe(light.roof)
  expect(clone.bounce).toEqual(light.bounce)
  expect(clone.userData).toEqual(light.userData)
  expect(() => new LanternLight({
    roof: {
      start: 0.8,
      end: 0.6,
      leak: 0.1,
    },
  })).toThrow(RangeError)
  expect(() => new LanternLight({
    roof: {
      start: 0.6,
      end: 0.8,
      leak: 1.5,
    },
  })).toThrow(RangeError)
  expect(() => new LanternLight({
    bounce: {
      distance: 4,
      radius: 0,
      share: 0.1,
    },
  })).toThrow(RangeError)
})
test('renderers shade lantern lights with their own node', () => {
  const library = new StandardNodeLibrary
  LanternLightNode.register(library)
  expect(library.getLightNodeClass(LanternLight) as unknown).toBe(LanternLightNode)
  expect(library.getLightNodeClass(PointLight) as unknown).not.toBe(LanternLightNode)
})
