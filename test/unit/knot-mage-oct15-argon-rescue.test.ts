import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {Texture} from 'three/webgpu'

const imported = [
  {
    id: 'aventurine_enamel',
    run: '7elL7dDIwnRWI8n',
    effortLevel: 'medium',
  },
  {
    id: 'raden_maki_e',
    run: '7elL7dDIwnRWI8n',
    effortLevel: 'medium',
  },
  {
    id: 'seraph_wings',
    run: '7elL7dDIwnRWI8n',
    effortLevel: 'medium',
  },
  {
    id: 'seraphim_crucible',
    run: '5hImMIyOl2S4OQR',
    effortLevel: 'high',
  },
]
describe('October 15 Gemini Argon knots rescued from crashed runs', () => {
  test('preserves the source run and model attribution', async () => {
    for (const {id, run, effortLevel} of imported) {
      const knot = knotsById.get(id)!
      expect(knot).toBeDefined()
      expect(knot.candidateId).toBe('gemini_argon')
      expect(knot.harness).toBe('Mage')
      expect(knot.author.model).toEqual({
        title: 'Gemini 4 Argon',
        slug: 'google/gemini-4-argon',
        effortLevel,
      })
      expect(knot.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      expect(await Bun.file(new URL('data.ts', folder)).text()).toContain(`Mage run: ${run}; fixture: knot-material-shaders; result: crashed`)
    }
  })
  test.each(imported.map(({id}) => id))('constructs %s without disposing caller lighting', async id => {
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
  test('resolves the name collisions', () => {
    expect(knotsById.get('cloisonne_lotus')!.author.model.effortLevel).toBe('low')
    expect(knotsById.get('aventurine_enamel')!.title).toBe('Aventurine Enamel')
    expect(knotsById.get('raden_maki_e')!.author.model.effortLevel).toBe('medium')
    expect(knotsById.get('koi_urushi')!.title).toBe('Koi Urushi')
    expect(knotsById.get('koi_urushi')!.author.model.effortLevel).toBe('low')
  })
})
