import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {unknown} from 'knot-materials/rarities.ts'
import {Texture} from 'three/webgpu'

const runId = 'BdUi8mU2Rs29CX7'
const imported = [
  ['caldera_heart', 'Caldera Heart'],
  ['starbirth_vessel', 'Starbirth Vessel'],
  ['ctenophore', 'Ctenophore'],
  ['celadon_repair', 'Celadon Repair'],
  ['passing_cloud', 'Passing Cloud'],
  ['ouroboros', 'Ouroboros'],
  ['heartwood', 'Heartwood'],
  ['lightning_ridge', 'Lightning Ridge'],
] as const

describe('October 9 Claude Opus 5.5 Mage shader imports', () => {
  test('registers all eight with their provenance and unknown rarity', async () => {
    expect(imported).toHaveLength(8)
    for (const [id, title] of imported) {
      const knot = knotsById.get(id)!
      expect(knot).toBeDefined()
      expect(knot.title).toBe(title)
      expect(knot.candidateId).toBe('claude_opus')
      expect(knot.harness).toBe('Mage')
      expect(knot.author.model).toEqual({
        title: 'Claude Opus 5.5',
        slug: 'anthropic/claude-opus-5.5',
        effortLevel: 'medium',
      })
      expect(knot.rarity).toBe(unknown)
      expect(knot.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL('../../packages/knot-materials/src/entries/' + id + '/', import.meta.url)
      expect((await fs.readdir(folder)).toSorted()).toEqual(['Material.ts', 'data.ts'])
      expect(await Bun.file(new URL('data.ts', folder)).text()).toContain(runId)
    }
  })

  test('constructs all eight materials without disposing the environment', async () => {
    for (const [id] of imported) {
      const file = new URL('../../packages/knot-materials/src/entries/' + id + '/Material.ts', import.meta.url)
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
    }
  }, 30_000)

  test('preserves Kintsugi and the older Stellar Nursery title', () => {
    expect(knotsById.get('kintsugi')!.title).toBe('Kintsugi')
    expect(knotsById.get('nebula_glass')!.title).toBe('Stellar Nursery')
    expect(knotsById.get('celadon_repair')!.title).toBe('Celadon Repair')
    expect(knotsById.get('starbirth_vessel')!.title).toBe('Starbirth Vessel')
  })
})
