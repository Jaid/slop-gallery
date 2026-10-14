import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import KnotMaterial from 'knot-materials/lib/KnotMaterial.ts'
import {Texture} from 'three/webgpu'

const imported = ['abyssal_nautilus', 'hopper_labyrinth', 'jade_cloisonne', 'cryo_seraph', 'morpho_reliquary', 'murano_millefiori', 'raku_celadon', 'seraphim_censers', 'void_singularity']
describe('October 14 medium-effort Gemini Argon arrivals', () => {
  test('preserves the source run and model attribution', async () => {
    for (const id of imported) {
      const knot = knotsById.get(id)!
      expect(knot).toBeDefined()
      expect(knot.candidateId).toBe('gemini_argon')
      expect(knot.harness).toBe('Mage')
      expect(knot.author.model).toEqual({
        title: 'Gemini 4 Argon',
        slug: 'google/gemini-4-argon',
        effortLevel: 'medium',
      })
      expect(knot.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      expect(await Bun.file(new URL('data.ts', folder)).text()).toContain('Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.')
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
  test('gives the Seraphim Censers cage a recessed core', async () => {
    const {default: Material} = await import('../../packages/knot-materials/src/entries/seraphim_censers/Material.ts')
    const material = new Material(new Texture)
    expect(material).toBeInstanceOf(KnotMaterial)
    expect(material.coreMaterial?.isMeshPhysicalNodeMaterial).toBe(true)
    material.dispose()
  })
  test('keeps both colliding names with their previous holders', () => {
    expect(knotsById.get('bismuth_ziggurat')!.candidateId).toBe('glm_flash')
    expect(knotsById.get('cloisonne_lotus')!.author.model.effortLevel).toBe('low')
    expect(knotsById.get('hopper_labyrinth')!.title).toBe('Hopper Labyrinth')
    expect(knotsById.get('jade_cloisonne')!.title).toBe('Jade Cloisonné')
  })
})
