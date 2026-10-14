import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const imported = ['oxide_ziggurat', 'celestial_armillary', 'cloisonne_lotus', 'cybernetic_mycelium', 'kerr_accretion', 'raden_maki_e', 'radium_diatom', 'seraphim_glass']
describe('October 14 Gemini Argon arrivals', () => {
  test('preserves the source run, model attribution, and unknown initial ratings', async () => {
    for (const id of imported) {
      const knot = knotsById.get(id)!
      expect(knot).toBeDefined()
      expect(knot.candidateId).toBe('gemini_argon')
      expect(knot.harness).toBe('Mage')
      expect(knot.author.model).toEqual({
        title: 'Gemini 4 Argon',
        slug: 'google/gemini-4-argon',
        effortLevel: 'low',
      })
      expect(knot.rarity).toBe(unknown)
      expect(knot.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      expect(await Bun.file(new URL('data.ts', folder)).text()).toContain('Mage run: 77fsRvmePazcbTS; fixture: knot-material-shaders; result: success.')
    }
  })
  test.each(imported)('constructs %s without disposing caller lighting', async id => {
    const file = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(file.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let disposals = 0
    environment.addEventListener('dispose', () => disposals++)
    const material = new Material(environment)
    expect(material.name).toBe(id)
    expect(material.envMap).toBe(environment)
    expect(material.isMeshPhysicalNodeMaterial).toBe(true)
    material.dispose()
    expect(disposals).toBe(0)
    environment.dispose()
  }, 20_000)
  test('leaves Event Horizon to its only prime holder', () => {
    expect([...knotsById.values()].filter(knot => knot.title === 'Event Horizon').map(knot => knot.id)).toEqual(['singularity_crown'])
    expect(knotsById.get('lightless_border')!.candidateId).toBe('claude_fable')
    expect(knotsById.get('schwarzschild_vault')!.title).toBe('Schwarzschild Vault')
    expect(knotsById.get('bismuth_ziggurat')!.candidateId).toBe('glm_flash')
    expect(knotsById.has('event_horizon')).toBe(false)
  })
})
