import type {KnotId, KnotMaterialConstructor} from 'knot-materials/types.ts'
import type {Node} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {selectKnotBays} from 'knot-materials/exhibition.ts'
import {positionView, positionViewDirection} from 'three/tsl'
import {Texture} from 'three/webgpu'

const batches = [
  {
    runId: 'H32IciRDAWJfwki',
    candidateId: 'claude_sonnet',
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
    ids: [
      'abyssal_lace',
      'candlelit_tesserae',
      'harlequin_awakening',
      'lenticular_oracle',
      'panoptes',
      'resonant_dust',
      'rosensweig_crown',
      'vesper_panes',
    ],
  },
  {
    runId: '5RXWnszENQQH6u3',
    candidateId: 'space_bunny',
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
    ids: [
      'cymatics',
      'damascus',
      'gilded_ruin',
      'restless_caldera',
      'nacre_tides',
      'nightjar',
      'soap_film',
      'velvet',
    ],
  },
  {
    runId: 'FLhq233R9MU4dj1',
    candidateId: 'gpt_sol',
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
    ids: [
      'sapphire_orrery',
      'winter_exhalation',
      'iris_engine',
      'rose_cathedral',
      'rosewood_oracle',
      'sovereign_velvet',
      'verdigris_testament',
      'willowwake',
    ],
  },
  {
    runId: 'HU72JSGdKyp7pBO',
    candidateId: 'gpt_sol',
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
    ids: [
      'cinnabar_bloom',
      'elderwood',
      'hoarfrost_choir',
      'oracle_vellum',
      'prismatic_seasons',
      'rootlight',
      'sidereal_alloy',
      'sunken_solstice',
    ],
  },
] as const
const imported = batches.flatMap(batch => batch.ids.map(id => ({
  ...batch,
  id,
})))
const collisions = [
  [
    'abyssal_chorus',
    'abyssal_lace',
    'Abyssal Chorus',
  ],
  [
    'harlequin_opal',
    'harlequin_awakening',
    'Harlequin Opal',
  ],
  [
    'vesper_glass',
    'vesper_panes',
    'Vesper Glass',
  ],
  [
    'kintsugi',
    'gilded_ruin',
    'Kintsugi',
  ],
  [
    'molten_core',
    'restless_caldera',
    'Molten Core',
  ],
  [
    'nacre',
    'nacre_tides',
    'Nacre',
  ],
  [
    'astral_orrery',
    'sapphire_orrery',
    'Astral Orrery',
  ],
  [
    'hoarfrost_hymn',
    'winter_exhalation',
    'Hoarfrost Hymn',
  ],
  [
    'prism_orchard',
    'prismatic_seasons',
    'Prism Orchard',
  ],
] as const
const displaced = new Set<KnotId>(['gilded_ruin', 'restless_caldera', 'verdigris_testament', 'cinnabar_bloom', 'rootlight'])
describe('October 3 Mage arrivals', () => {
  test('registers all thirty-two independent entries with source-run attribution', async () => {
    expect(imported).toHaveLength(32)
    expect(new Set(imported.map(entry => entry.id)).size).toBe(32)
    expect(new Set(imported.map(entry => knotsById.get(entry.id)!.title)).size).toBe(32)
    for (const {id, runId, candidateId, model} of imported) {
      const entry = knotsById.get(id)!
      expect(entry.candidateId).toBe(candidateId)
      expect(entry.harness).toBe('Mage')
      expect(entry.author.model).toEqual(model)
      expect(entry.rarity).toBeGreaterThanOrEqual(0)
      expect(entry.rarity).toBeLessThanOrEqual(4)
      expect(entry.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      const files = await fs.readdir(folder)
      expect(files.toSorted()).toEqual(['Material.ts', 'data.ts'])
      const data = await Bun.file(new URL('data.ts', folder)).text()
      expect(data).toContain(`Mage run: ${runId}`)
      expect(data).toContain('fixture: knot-material-shaders; result: success')
      const source = await Bun.file(new URL('Material.ts', folder)).text()
      expect(source).toMatch(/export default class extends (?:KnotMaterial|ReliefKnotMaterial)/u)
      expect(source).not.toContain("from './lib/")
    }
  })
  test.each(imported)('constructs $id without owning caller lighting', async ({id}) => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let environmentDisposals = 0
    environment.addEventListener('dispose', () => environmentDisposals++)
    try {
      const material = new Material(environment)
      try {
        expect(material.name).toBe(id)
        expect(material.envMap).toBe(environment)
        expect(material.isMeshPhysicalNodeMaterial).toBe(true)
        expect(Boolean(material.positionNode)).toBe(displaced.has(id))
        expect(Boolean(knotsById.get(id)!.displacement)).toBe(displaced.has(id))
        if (material.positionNode) {
          expect(material.normalNode).not.toBeNull()
          const dependencies = new Set<Node>([material.positionNode])
          for (const node of dependencies) {
            for (const child of node.getChildren()) {
              dependencies.add(child)
            }
          }
          expect(dependencies.has(positionView)).toBe(false)
          expect(dependencies.has(positionViewDirection)).toBe(false)
        }
      } finally {
        material.dispose()
      }
      expect(environmentDisposals).toBe(0)
    } finally {
      environment.dispose()
    }
  }, 20_000)
  test('preserves all nine existing names while keeping the alternatives distinct', () => {
    expect(collisions).toHaveLength(9)
    for (const [oldId, newId, title] of collisions) {
      expect(knotsById.get(oldId)!.title).toBe(title)
      expect(knotsById.get(newId)!.title).not.toBe(title)
      expect(knotsById.get(oldId)!.flavorText).not.toBe(knotsById.get(newId)!.flavorText)
    }
  })
  test('selects the complete review batch without falling back to older entries', () => {
    const ids = imported.map(entry => entry.id)
    const selected = selectKnotBays(`?knot_id=${ids.join(',')}`)
    expect(selected).toHaveLength(3)
    expect(new Set(selected.flatMap(bay => bay.finishes.map(entry => entry.id)))).toEqual(new Set(ids))
  })
  test('keeps imported relief in centimeters rather than meters', async () => {
    for (const id of ['gilded_ruin', 'restless_caldera'] as const) {
      const source = await Bun.file(new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)).text()
      expect(source).toContain('mul(knotData.displacement)')
    }
    expect(knotsById.get('gilded_ruin')!.displacement).toBe(0.02)
    expect(knotsById.get('restless_caldera')!.displacement).toBe(0.03)
    expect((0.55 + 0.14) * 0.02).toBeLessThan(0.02)
    expect((0.6 + 0.26) * 0.03).toBeLessThan(0.03)
  })
})
