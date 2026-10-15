import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {Texture} from 'three/webgpu'

const imported = ['abyssal_ctenophore', 'basalt_caldera', 'kintsugi_celadon', 'seraphim_astrolabe']
describe('October 15 medium-effort Gemini Argon arrivals', () => {
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
      expect(await Bun.file(new URL('data.ts', folder)).text()).toContain('Mage run: K45USvVjintSE0u; fixture: knot-material-shaders; result: success.')
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
  test('gives the colliding name to the new knot', () => {
    expect(knotsById.get('abyssal_ctenophore')!.candidateId).toBe('gemini_argon')
    expect(knotsById.get('ciliary_rainbow')!.title).toBe('Ciliary Rainbow')
    expect(knotsById.get('ciliary_rainbow')!.candidateId).toBe('gemini_flash')
  })
})
