import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const runs = [
  ['KsUDOPCUWqzzKMp', 'max', 'ferrofluid_psalm hoarfrost_relic kintsugi_porcelain peacock_plumage rose_reliquary'],
  ['MgSdUInR50wESrr', 'max', 'hadal_beacon anamorphosis lunar_kintsugi morpho_mirage solar_maelstrom'],
  ['AfC9LOF1p8reY9V', 'max', 'golden_heirloom labradorescence passing_clouds'],
  ['Am1BnNRHvHbHCa2', 'max', 'abyssal_anemones gilded_loom glacier_testament morpho_drift'],
  ['GsOIgdKyNa5oEPr', 'high', 'emberveil golden_scar morpho_liturgy'],
  ['D2pmfQp7iycRJKh', 'max', 'captive_sun empress_brocade morpho_vow'],
] as const
const imported = runs.flatMap(([run, effort, ids]) => ids.split(' ').map(id => ({
  run,
  effort,
  id,
})))
describe('Muse Wonder October 13 Mage imports', () => {
  test('registers 23 unique entries, preserving run attribution', async () => {
    expect(imported).toHaveLength(23)
    expect(new Set(imported.map(item => item.id)).size).toBe(23)
    for (const {id, run, effort} of imported) {
      const entry = knotsById.get(id)!
      expect(entry).toBeDefined()
      expect(entry.candidateId).toBe('muse_wonder')
      expect(entry.harness).toBe('Mage')
      expect(entry.author.model).toEqual({
        title: 'Muse Wonder 1.0',
        slug: 'meta/muse-wonder-1.0',
        effortLevel: effort,
      })
      expect(entry.rarity).toBe(unknown)
      expect(entry.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const data = await Bun.file(new URL('data.ts', folder)).text()
      expect(data).toContain(run)
      expect(data).toContain('knot-material-shaders')
    }
  })
  test.each(imported)('constructs $id with caller-owned lighting', async ({id}) => {
    const file = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(file.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let disposals = 0
    environment.addEventListener('dispose', () => disposals++)
    try {
      const material = new Material(environment)
      expect(material.name).toBe(id)
      expect(material.envMap).toBe(environment)
      expect(material.isMeshPhysicalNodeMaterial).toBe(true)
      material.dispose()
      expect(disposals).toBe(0)
    } finally {
      environment.dispose()
    }
  }, 20_000)
  test('preserves all previously registered collisions and the two distinct Morpho Liturgy variants', () => {
    for (const [oldId, newId] of [
      ['rose_window', 'rose_reliquary'],
      ['abyssal_lantern', 'hadal_beacon'],
      ['kintsugi_moon', 'lunar_kintsugi'],
      ['kintsugi', 'golden_heirloom'],
      ['abyssal_bloom', 'abyssal_anemones'],
      ['glacier_memory', 'glacier_testament'],
      ['kintsugi', 'golden_scar'],
    ]) {
      expect(knotsById.has(oldId)).toBe(true)
      expect(knotsById.has(newId)).toBe(true)
      expect(knotsById.get(oldId)!.title).not.toBe(knotsById.get(newId)!.title)
    }
    expect(knotsById.get('morpho_liturgy')!.title).toBe('Morpho Liturgy')
    expect(knotsById.get('morpho_vow')!.title).toBe('Morpho Vow')
    expect(knotsById.get('morpho_liturgy')!.flavorText).not.toBe(knotsById.get('morpho_vow')!.flavorText)
  })
})
