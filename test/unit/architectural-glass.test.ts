import {expect, spyOn, test} from 'bun:test'

import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import {floorGlassThickness} from '../../src/lib/gallery/floors.ts'
import {lodgeWindow} from '../../src/lib/gallery/lodge.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '../../src/lib/materials/ArchitecturalGlassMaterials.ts'

test('performance glass is one shared plain material for lobby and cabin', () => {
  const materials = createArchitecturalGlassMaterials(false)
  expect(materials.lobby).toBe(materials.cabin)
  expect(materials.lobby).toBeInstanceOf(MeshStandardNodeMaterial)
  const material = materials.lobby as MeshStandardNodeMaterial
  expect(material.transparent).toBe(true)
  expect(material.depthWrite).toBe(false)
  expect(material.envMapIntensity).toBe(0)
  const dispose = spyOn(material, 'dispose')
  disposeArchitecturalGlassMaterials(materials)
  expect(dispose).toHaveBeenCalledTimes(1)
})
test('quality glass gives lobby and cabin distinct physical treatments', () => {
  const materials = createArchitecturalGlassMaterials(true)
  expect(materials.lobby).not.toBe(materials.cabin)
  expect(materials.lobby).toBeInstanceOf(MeshPhysicalNodeMaterial)
  expect(materials.cabin).toBeInstanceOf(MeshPhysicalNodeMaterial)
  const lobby = materials.lobby as MeshPhysicalNodeMaterial
  const cabin = materials.cabin as MeshPhysicalNodeMaterial
  expect(lobby.thickness).toBe(floorGlassThickness)
  expect(cabin.thickness).toBe(lodgeWindow.glassThickness)
  expect(lobby.roughness).toBeLessThan(cabin.roughness)
  expect(lobby.transmission).toBeGreaterThan(cabin.transmission)
  expect(lobby.ior).not.toBe(cabin.ior)
  expect(lobby.attenuationColor.getHex()).not.toBe(cabin.attenuationColor.getHex())
  disposeArchitecturalGlassMaterials(materials)
})
