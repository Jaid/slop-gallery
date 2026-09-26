import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const runs = [
  ['K0nU326lufLQTl2', 'space_bunny', 'mixed', 'abyssal_medusa amber_vigil chladni_requiem cinnabar_requiem neon_relic rime_cathedral strata desert_tiger_eye'],
  ['7V0v37e8AD5LVut', 'space_bunny', 'mixed', 'thin_film_ephemera frost_genealogy lantern_mycelium moire_vespers octahedrite sanguine_nap singing_sand tesserae'],
  ['FazbrK93jHSafY1', 'claude_opus', 'success', 'great_cat_emergence'],
  ['C9HMqRObyAfKheL', 'claude_opus', 'mixed', 'felis_major_menagerie'],
] as const
const authors = {
  space_bunny: {
    title: 'Space Bunny Alpha',
    slug: 'stealth/space-bunny-alpha',
    effortLevel: 'max',
  },
  claude_opus: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'medium',
  },
} as const
const imported = runs.flatMap(([runId, candidateId, result, ids]) => ids.split(' ').map(id => ({
  runId,
  candidateId,
  result,
  id,
})))
describe('mixed Mage knot imports', () => {
  test('registers complete candidate entries from mixed and successful runs', async () => {
    expect(imported).toHaveLength(18)
    expect(new Set(imported.map(entry => entry.id)).size).toBe(18)
    expect(imported.filter(entry => entry.result === 'mixed')).toHaveLength(17)
    for (const entry of imported) {
      const data = knotsById.get(entry.id)!
      expect(data).toBeDefined()
      expect(data.candidateId).toBe(entry.candidateId)
      expect(data.harness).toBe('Mage')
      expect(data.author.model).toEqual(authors[entry.candidateId])
      expect(data.rarity).toBe(unknown)
      expect(data.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${entry.id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const source = await Bun.file(new URL('data.ts', folder)).text()
      expect(source).toContain(entry.runId)
      expect(source).toContain('knot-material-')
      if (entry.result === 'mixed') {
        expect(source).toContain('result: mixed')
      }
    }
  })
  test.each(imported)('constructs $id with caller-owned lighting', async ({id}) => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let environmentDisposals = 0
    environment.addEventListener('dispose', () => environmentDisposals++)
    try {
      const material = new Material(environment)
      expect(material.name).toBe(id)
      expect(material.envMap).toBe(environment)
      expect(material.isMeshPhysicalNodeMaterial).toBe(true)
      if (knotsById.get(id)!.displacement) {
        expect(material.positionNode).not.toBeNull()
        expect(material.normalNode).not.toBeNull()
      }
      material.dispose()
      expect(environmentDisposals).toBe(0)
    } finally {
      environment.dispose()
    }
  }, 20_000)
  test('preserves all existing collision identities', () => {
    for (const [existing, incoming] of [
      ['tiger_eye', 'desert_tiger_eye'],
      ['ephemera', 'thin_film_ephemera'],
    ]) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
    expect(knotsById.get('felis_major')!.title).toBe('Felis Major')
    expect(knotsById.get('great_cat_emergence')!.title).toBe('Great Cat Emergence')
    expect(knotsById.get('felis_major_menagerie')!.title).toBe('Felis Major Menagerie')
    expect(new Set([
      knotsById.get('felis_major')!.flavorText,
      knotsById.get('great_cat_emergence')!.flavorText,
      knotsById.get('felis_major_menagerie')!.flavorText,
    ]).size).toBe(3)
  })
})
