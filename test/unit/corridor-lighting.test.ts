import {expect, test} from 'bun:test'

import {AmbientLight, DirectionalLight, HemisphereLight, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, PointLight} from 'three/webgpu'

import {IndoorLightsNode, lightIndoors} from '../../src/lib/materials/lights/index.ts'

test('enclosed spaces take every light but the sun', () => {
  const indoors = new IndoorLightsNode
  for (const light of [new AmbientLight, new HemisphereLight, new PointLight]) {
    expect(indoors.admits(light)).toBe(true)
  }
  expect(indoors.admits(new DirectionalLight)).toBe(false)
})
test('adopted materials keep the scene’s environment and their own share of it', () => {
  const wood = lightIndoors(new MeshStandardNodeMaterial({envMapIntensity: 0.2}))
  expect(wood.envMap).toBeNull()
  expect(wood.envMapIntensity).toBe(0.2)
  const glass = lightIndoors(new MeshPhysicalNodeMaterial({envMapIntensity: 1.6}))
  expect(glass.envMap).toBeNull()
  expect(glass.envMapIntensity).toBe(1.6)
  for (const material of [wood, glass]) {
    material.dispose()
  }
})
