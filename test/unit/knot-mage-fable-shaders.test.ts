import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const runId = 'KKRUCJSg0WdighD'
const ids = [
  'glacial_heart',
  'pocket_nebula',
  'mercurial_tide',
  'harlequin_lattice_opal',
  'thousand_folds',
  'kintsugi_moon',
  'abyssal_pulse',
  'lantern_vigil',
] as const
describe('Claude Fable 5.1 Mage shader imports', () => {
  test('registers all requested entries with exact run provenance', async () => {
    expect(ids).toHaveLength(8)
    for (const id of ids) {
      const entry = knotsById.get(id)!
      expect(entry).toBeDefined()
      expect(entry.candidateId).toBe('claude_fable')
      expect(entry.harness).toBe('Mage')
      expect(entry.author.model).toEqual({
        title: 'Claude Fable 5.1',
        slug: 'anthropic/claude-fable-5.1',
        effortLevel: 'high',
      })
      expect(entry.rarity).toBe(unknown)
      expect(entry.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const source = await Bun.file(new URL('data.ts', folder)).text()
      expect(source).toContain(runId)
      expect(source).toContain('fixture: knot-material-shaders')
    }
  })
  test.each(ids)('constructs %s with caller-owned environment', async id => {
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
  test('preserves the colliding existing entries', () => {
    for (const [existing, incoming] of [
      ['mercury_tide', 'mercurial_tide'],
      ['harlequin_opal', 'harlequin_lattice_opal'],
      ['abyssal_bloom', 'abyssal_pulse'],
    ]) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
    expect(knotsById.get('abyssal_bloom')!.title).toBe('Abyssal Bloom')
    expect(knotsById.get('hadal_blossom')!.title).toBe('Abyssal Bloom')
    expect(knotsById.get('abyssal_pulse')!.title).toBe('Abyssal Pulse')
  })
})
