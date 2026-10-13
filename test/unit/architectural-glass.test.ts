import {expect, spyOn, test} from 'bun:test'

import {MeshStandardNodeMaterial} from 'three/webgpu'

import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '../../src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastFloorGlassMaterial from '../../src/lib/materials/CastFloorGlassMaterial.ts'
import ClearGlassMaterial from '../../src/lib/materials/ClearGlassMaterial.ts'

test('fast glass keeps its plain shared pane for lobby and cabin and the original tunnel pane', () => {
  const materials = createArchitecturalGlassMaterials(false)
  expect(materials.lobby).toBe(materials.cabin)
  expect(materials.lobby).toBeInstanceOf(MeshStandardNodeMaterial)
  const material = materials.lobby as MeshStandardNodeMaterial
  expect(material.transparent).toBe(true)
  expect(material.depthWrite).toBe(false)
  expect(material.envMapIntensity).toBe(0)
  const tunnel = materials.tunnel as MeshStandardNodeMaterial
  expect(tunnel).not.toBe(material)
  expect(tunnel.opacity).toBe(0.16)
  expect(tunnel.color.getHexString()).toBe('b7d8d9')
  const disposals = [material, tunnel].map(entry => spyOn(entry, 'dispose'))
  disposeArchitecturalGlassMaterials(materials)
  for (const dispose of disposals) {
    expect(dispose).toHaveBeenCalledTimes(1)
  }
})
test('heavy floor glass refracts the room below through cast pavers', () => {
  const materials = createArchitecturalGlassMaterials(true)
  const lobby = materials.lobby as CastFloorGlassMaterial
  expect(lobby).toBeInstanceOf(CastFloorGlassMaterial)
  expect(lobby.name).toBe('lobby-glass-heavy')
  // The view through the floor is refracted by the material itself, after every opaque surface below has been drawn.
  expect(lobby.transparent).toBe(true)
  expect(lobby.transmission).toBe(0)
  expect(lobby.emissiveNode).not.toBeNull()
  expect(lobby.normalNode).not.toBeNull()
  disposeArchitecturalGlassMaterials(materials)
})
test('heavy cabin and tunnel glass blend over the untouched backdrop so the view stays sharp', () => {
  const materials = createArchitecturalGlassMaterials(true)
  const panes = [materials.cabin, materials.tunnel] as Array<ClearGlassMaterial>
  expect(materials.cabin).not.toBe(materials.tunnel)
  for (const pane of panes) {
    expect(pane).toBeInstanceOf(ClearGlassMaterial)
    // Physical transmission would resample the backdrop through a smoothing filter.
    expect(pane.transmission).toBe(0)
    expect(pane.transparent).toBe(true)
    expect(pane.depthWrite).toBe(false)
    expect(pane.roughness).toBe(0)
    expect(pane.color.getHex()).toBe(0)
    expect(pane.opacityNode).not.toBeNull()
  }
  const [cabin, tunnel] = panes
  expect(cabin.name).toBe('cabin-glass-heavy')
  expect(tunnel.name).toBe('tunnel-glass-heavy')
  expect(cabin.clearcoat).toBeGreaterThan(0)
  expect(tunnel.iridescence).toBeGreaterThan(0)
  const disposals = [materials.lobby, ...panes].map(material => spyOn(material, 'dispose'))
  disposeArchitecturalGlassMaterials(materials)
  for (const dispose of disposals) {
    expect(dispose).toHaveBeenCalledTimes(1)
  }
})
