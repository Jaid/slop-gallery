import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {Texture} from 'three/webgpu'

const runs = [
  ['0gaFob3tIS0Bvlc', 'high', 'aurora_loom molten_meridian milkfire'],
  ['EC58pRKjMMMNqsv', 'medium', 'abyssal_pearl midnight_jacquard resin_nebula pyre_heart'],
  ['Cp16WUQoUlMTqRD', 'xhigh', 'abyssal_lantern amethyst_choir glass_cathedral porcelain_moon murano_breath peacock_psalm changeant_brocade sylvan_relic'],
  ['2b7SAOfgKTVu0qb', 'max', 'abyssal_choir cathedral_skin fire_in_milk golden_mending quicksilver_dew'],
] as const
const imported = runs.flatMap(([runId, effortLevel, ids]) => ids.split(' ').map(id => ({
  id,
  runId,
  effortLevel,
})))
describe('October 13 Muse Wonder arrivals', () => {
  test('preserves the source runs and model attribution', async () => {
    expect(imported).toHaveLength(20)
    expect(new Set(imported.map(entry => entry.id)).size).toBe(20)
    for (const item of imported) {
      const knot = knotsById.get(item.id)!
      expect(knot).toBeDefined()
      expect(knot.candidateId).toBe('muse_wonder')
      expect(knot.harness).toBe('Mage')
      expect(knot.author.model).toEqual({
        title: 'Muse Wonder 1.0',
        slug: 'meta/muse-wonder-1.0',
        effortLevel: item.effortLevel,
      })
      expect(knot.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${item.id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const data = await Bun.file(new URL('data.ts', folder)).text()
      expect(data).toContain(`Mage run: ${item.runId}; fixture: knot-material-shaders; result: success.`)
    }
  })
  test.each(imported)('constructs $id without disposing caller lighting', async ({id}) => {
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
  test('resolves every title collision with the existing collection', () => {
    for (const [id, title, candidateId] of [
      ['night_warp', 'Night Warp', 'grok'],
      ['shoreless_pearl', 'Shoreless Pearl', 'gpt_terra'],
      ['benthic_beacon', 'Benthic Beacon', 'gpt_astra'],
      ['hadal_lantern', 'Hadal Lantern', 'claude_fable'],
      ['fathom_hymn', 'Fathom Hymn', 'glm'],
      ['cinder_meridian', 'Cinder Meridian', 'grok'],
      ['pocket_nebula', 'Pocket Nebula', 'claude_fable'],
      ['kintsugi_moon', 'Kintsugi Moon', 'claude_fable'],
      ['shot_silk', 'Shot Silk', 'claude_haiku'],
      ['quicksilver_tide', 'Quicksilver Tide', 'claude_sonnet'],
    ] as const) {
      const knot = knotsById.get(id)!
      expect(knot.title).toBe(title)
      expect(knot.candidateId).toBe(candidateId)
    }
    const titles = imported.map(item => knotsById.get(item.id)!.title)
    for (const knot of knotsById.values()) {
      if (knot.candidateId !== 'muse_wonder') {
        expect(titles).not.toContain(knot.title)
      }
    }
  })
})
