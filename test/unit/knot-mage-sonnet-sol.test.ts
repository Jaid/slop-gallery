import type {KnotId, KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {selectKnotBays} from 'knot-materials/exhibition.ts'
import {Texture} from 'three/webgpu'

const batches = [
  {
    runId: '1o1ree11eGriGjv',
    candidate: 'claude_sonnet',
    result: 'mixed',
    ids: ['brilliant_cut', 'chatoyant_dusk', 'parallax_deep_field', 'magnetic_diadem', 'harlequin_depths', 'gilded_moon', 'medusa_pulse', 'quicksilver_tide'],
  },
  {
    runId: '5WDU20J87Ktg4fx',
    candidate: 'claude_sonnet',
    result: 'mixed',
    ids: ['amber_cosmos', 'celestial_brocade', 'frozen_thunder', 'harlequin_mosaic', 'kintsugi_night', 'magnetic_bloom', 'mercury_rain', 'petrol_aurora'],
  },
  {
    runId: 'CyxjCrlY15yEfmL',
    candidate: 'claude_sonnet',
    result: 'mixed',
    ids: ['bismuth_stairwell', 'cinder_psalm', 'halcyon_bubble', 'harlequin_sunrise', 'winter_ferns', 'gilded_midnight', 'marbled_dusk', 'peacock_eclipse'],
  },
  {
    runId: '42qNahiwSEZ3v90',
    candidate: 'gpt_sol',
    result: 'success',
    ids: ['chroma_cipher', 'dream_reservoir', 'mosslight', 'ossuary_lace', 'petalwake', 'prismatic_trellis', 'strata_cantata', 'vermilion_tide'],
  },
  {
    runId: '2tmj6W7XIniDLsB',
    candidate: 'gpt_sol',
    result: 'success',
    ids: ['amber_memorial', 'argent_bloom', 'cobalt_orchard', 'glacial_vigil', 'koi_ascendant', 'opal_oracle', 'rose_engine', 'sidereal_well'],
  },
] as const
const models = {
  claude_sonnet: {
    title: 'Claude Sonnet 5.5',
    slug: 'anthropic/claude-sonnet-5.5',
    effortLevel: 'high',
  },
  gpt_sol: {
    title: 'GPT-6.1 Sol',
    slug: 'openai/gpt-6.1-sol',
    effortLevel: 'xhigh',
  },
} as const
const imported = batches.flatMap(batch => batch.ids.map(id => ({
  ...batch,
  id,
})))
const displaced = new Set<KnotId>(['brilliant_cut', 'magnetic_diadem', 'medusa_pulse', 'quicksilver_tide', 'magnetic_bloom', 'mercury_rain', 'cinder_psalm', 'mosslight'])
describe('Sonnet and Sol Mage batch integration', () => {
  test('retains forty distinct entries, models, efforts and run results', async () => {
    expect(imported).toHaveLength(40)
    const identities = new Set(imported.map(entry => entry.id))
    const titles = new Set(imported.map(entry => knotsById.get(entry.id)!.title))
    expect(identities.size).toBe(40)
    expect(titles.size).toBe(40)
    expect(imported.filter(entry => entry.result === 'mixed')).toHaveLength(24)
    for (const {id, runId, candidate, result} of imported) {
      const entry = knotsById.get(id)!
      expect(entry.candidateId).toBe(candidate)
      expect(entry.author.model).toEqual(models[candidate])
      expect(entry.harness).toBe('Mage')
      // Ratings can change after review; provenance must not depend on an unknown rating.
      expect(entry.rarity).toBeGreaterThanOrEqual(0)
      expect(entry.rarity).toBeLessThanOrEqual(4)
      expect(entry.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      const files = await fs.readdir(folder)
      expect(files.toSorted()).toEqual(['Material.ts', 'data.ts'])
      const data = await Bun.file(new URL('data.ts', folder)).text()
      expect(data).toContain(`Mage run: ${runId}`)
      expect(data).toContain('fixture: knot-material-shaders')
      expect(data).toContain(`result: ${result}`)
      const source = await Bun.file(new URL('Material.ts', folder)).text()
      expect(source).toContain('export default class extends KnotMaterial')
      expect(source).not.toContain("from './lib/")
    }
  })
  test.each(imported)('constructs $id with accurate geometry metadata and caller-owned lighting', async ({id}) => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let disposed = 0
    environment.addEventListener('dispose', () => disposed++)
    try {
      const material = new Material(environment)
      try {
        expect(material.name).toBe(id)
        expect(material.envMap).toBe(environment)
        expect(material.isMeshPhysicalNodeMaterial).toBe(true)
        expect(Boolean(material.positionNode)).toBe(displaced.has(id))
        expect(Boolean(knotsById.get(id)!.displacement)).toBe(displaced.has(id))
        if (displaced.has(id)) {
          expect(material.normalNode).not.toBeNull()
        }
      } finally {
        material.dispose()
      }
      expect(disposed).toBe(0)
    } finally {
      environment.dispose()
    }
  })
  test('keeps the three incoming Harlequins and two Kintsugi Nights independently reviewable', () => {
    const alternatives = ['harlequin_opal', 'harlequin_depths', 'harlequin_mosaic', 'harlequin_sunrise', 'kintsugi_night', 'gilded_midnight'] as const
    const entries = alternatives.map(id => knotsById.get(id)!)
    const titles = new Set(entries.map(entry => entry.title))
    const descriptions = new Set(entries.map(entry => entry.flavorText))
    expect(titles.size).toBe(alternatives.length)
    expect(descriptions.size).toBe(alternatives.length)
    for (const [existing, incoming] of [
      ['deep_field', 'parallax_deep_field'],
      ['ferrofluid_crown', 'magnetic_diadem'],
      ['kintsugi_moon', 'gilded_moon'],
      ['bismuth_hopper', 'bismuth_stairwell'],
      ['hoarfrost', 'winter_ferns'],
      ['prism_orchard', 'prismatic_trellis'],
    ] as const) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
  })
  test('filters the new models without including older models from the same candidate', () => {
    for (const [candidate, slug, count] of [['claude_sonnet', 'claude-sonnet-5.5', 24], ['gpt_sol', 'gpt-6.1-sol', 16]] as const) {
      const bays = selectKnotBays(`?model=${slug}&shots=${count}`)
      expect(bays).toHaveLength(1)
      expect(bays[0].candidate.data.id).toBe(candidate)
      expect(bays[0].finishes).toHaveLength(count)
      expect(bays[0].finishes.every(entry => entry.author.model.slug === models[candidate].slug)).toBe(true)
    }
  })
  test('bounds the octagonal inset and worst-case magnetic and droplet displacement', () => {
    expect(knotsById.get('brilliant_cut')!.displacement!).toBeGreaterThanOrEqual(0.13 * (1 - Math.cos(Math.PI / 8)))
    expect(knotsById.get('magnetic_diadem')!.displacement!).toBeGreaterThanOrEqual(Math.hypot(0.066 * 1.1 - 0.018, 0.066 * 1.1 * 0.5))
    expect(knotsById.get('magnetic_bloom')!.displacement!).toBeGreaterThanOrEqual(Math.hypot(0.078, 0.078 * 0.55))
    const large = 0.03 * 0.95 * 1.14 + Math.log(9) / 170
    const small = 0.0085 * 0.95 * 1.14 + Math.log(9) / 420
    expect(knotsById.get('mercury_rain')!.displacement!).toBeGreaterThanOrEqual(large + small)
  })
})
