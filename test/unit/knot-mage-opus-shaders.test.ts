import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fsExtra from 'fs-extra'
import {knotsById} from 'knot-materials'
import {unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const runs = [
  ['IgNMLTcxWnW8Pin', 'amber_vault captive_lightning ctenophore_nocturne golden_repair harlequin_night_opal imperial_damask rose_medallions sleeping_wyrm'],
  ['7EtWKdJKgEioEdL', 'abyssal_chorus frostbound_ember harlequin_fire imperial_guilloche lapis_firmament mended_tide sunset_rose_window watching_stone'],
] as const

const imported = runs.flatMap(([runId, ids]) => ids.split(' ').map(id => ({runId, id})))

describe('Claude Opus 5.5 Mage shader imports', () => {
  test('registers all requested entries with exact run provenance', async () => {
    expect(imported).toHaveLength(16)
    expect(new Set(imported.map(entry => entry.id)).size).toBe(imported.length)
    for (const {id, runId} of imported) {
      const entry = knotsById.get(id)!
      expect(entry).toBeDefined()
      expect(entry.candidateId).toBe('claude_opus')
      expect(entry.harness).toBe('Mage')
      expect(entry.author.model).toEqual({title: 'Claude Opus 5.5', slug: 'anthropic/claude-opus-5.5', effortLevel: 'medium'})
      expect(entry.rarity).toBe(unknown)
      expect(entry.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL('../../packages/knot-materials/src/entries/' + id + '/', import.meta.url)
      expect((await fsExtra.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const source = await Bun.file(new URL('data.ts', folder)).text()
      expect(source).toContain(runId)
      expect(source).toContain('fixture: knot-material-shaders')
    }
  })

  test.each(imported)('constructs $id with caller-owned environment', async ({id}) => {
    const url = new URL('../../packages/knot-materials/src/entries/' + id + '/Material.ts', import.meta.url)
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

  test('keeps all collision variants independent', () => {
    for (const [existing, incoming] of [
      ['amber_reliquary', 'amber_vault'],
      ['harlequin_opal', 'harlequin_night_opal'],
      ['rose_window', 'rose_medallions'],
      ['rose_window', 'sunset_rose_window'],
    ]) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
    expect(new Set([knotsById.get('rose_window')!.flavorText, knotsById.get('rose_medallions')!.flavorText, knotsById.get('sunset_rose_window')!.flavorText]).size).toBe(3)
  })
})
