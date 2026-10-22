import {expect, test} from 'bun:test'

import {AmbientLight, DirectionalLight, HemisphereLight, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, PointLight} from 'three/webgpu'

import {corridorLanterns, IndoorLightsNode, LanternLightsNode, lodgeWindowLights} from '../../src/lib/materials/lights/index.ts'

const lamp = (zone: LanternLightsNode) => {
  const light = new PointLight
  Object.assign(light.userData, zone.lampUserData())
  return light
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
test('adopted materials keep the scene’s environment and their own share of it', () => {
  const wood = corridorLanterns.adopt(new MeshStandardNodeMaterial({envMapIntensity: 0.2}))
  expect(wood.lightsNode).toBe(corridorLanterns)
  expect(wood.envMap).toBeNull()
  expect(wood.envMapIntensity).toBe(0.2)
  const glass = lodgeWindowLights.adopt(new MeshPhysicalNodeMaterial({envMapIntensity: 1.6}))
  expect(glass.envMap).toBeNull()
  expect(glass.envMapIntensity).toBe(1.6)
  for (const material of [wood, glass]) {
    material.dispose()
  }
})
