import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {special, unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const runs = [
  ['8sVVxqasPWO5s9R', 'claude_fable', 'Claude Fable 5.1', 'anthropic/claude-fable-5.1', 'high', 'knot-material-dot', 'success', 'plush_soiree'],
  ['CbMOkykhfBD7NuC', 'claude_haiku', 'Claude Haiku 5.5', 'anthropic/claude-haiku-5.5', 'medium', 'knot-material-shaders', 'mixed', 'kintsugi_vessel mandarin_brocade sleeping_agate chladni_rhythm'],
  ['3gQGAbAm59HYY8k', 'claude_haiku', 'Claude Haiku 5.5', 'anthropic/claude-haiku-5.5', 'medium', 'knot-material-shaders', 'mixed', 'lodestone_bloom soap_psalm gilded_glaze velvet_dusk caustic_undertow nodal_choir noctiluca_tide raden_lacquer'],
  ['ImzJ438LsWTlcom', 'claude_haiku', 'Claude Haiku 5.5', 'anthropic/claude-haiku-5.5', 'xhigh', 'knot-material-shaders', 'mixed', 'shot_silk rime_sovereign amber_candle'],
  ['I3AQt6jqWYHzO6i', 'claude_opus', 'Claude Opus 5.5', 'anthropic/claude-opus-5.5', 'medium', 'knot-material-dot', 'success', 'knotty_prince'],
] as const
const imported = runs.flatMap(([runId, candidateId, title, slug, effortLevel, fixture, result, ids]) => ids.split(' ').map(id => ({
  id,
  runId,
  candidateId,
  title,
  slug,
  effortLevel,
  fixture,
  result,
})))
describe('October 12 Mage arrivals', () => {
  test('preserves the source runs, model attribution, and unknown initial ratings', async () => {
    expect(imported).toHaveLength(17)
    expect(new Set(imported.map(entry => entry.id)).size).toBe(17)
    expect(imported.filter(entry => entry.result === 'mixed')).toHaveLength(15)
    for (const item of imported) {
      const knot = knotsById.get(item.id)!
      expect(knot).toBeDefined()
      expect(knot.candidateId).toBe(item.candidateId)
      expect(knot.harness).toBe('Mage')
      expect(knot.author.model).toEqual({
        title: item.title,
        slug: item.slug,
        effortLevel: item.effortLevel,
      })
      // Knotty Prince was later curated as special.
      expect(knot.rarity).toBe(item.id === 'knotty_prince' ? special : unknown)
      expect(knot.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${item.id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const data = await Bun.file(new URL('data.ts', folder)).text()
      expect(data).toContain(item.runId)
      expect(data).toContain(item.fixture)
      expect(data).toContain(`result: ${item.result}`)
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
  test('keeps the three pre-existing collision identities intact', () => {
    for (const [existing, incoming] of [
      ['chladni_requiem', 'chladni_rhythm'],
      ['gilded_fracture', 'gilded_glaze'],
      ['amber_vigil', 'amber_candle'],
    ]) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
  })
})
