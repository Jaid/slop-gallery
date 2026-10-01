import type {KnotId, KnotMaterialConstructor} from 'knot-materials/types.ts'
import type {Node} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {selectKnotBays} from 'knot-materials/exhibition.ts'
import {knotGeometryArgs} from 'knot-materials/geometry.ts'
import {positionView, positionViewDirection} from 'three/tsl'
import {Texture} from 'three/webgpu'

const batches = [
  {
    runId: 'HdWJtzJ2GnPe32p',
    candidate: 'space_bunny',
    result: 'success',
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
    ids: ['feldspar_veil', 'kintsugi_vow', 'crimson_nap', 'ink_tide', 'morpho_wing', 'glacier_hush', 'basalt_crown', 'ferro_tide'],
  },
  {
    runId: 'MDsU2CH3XEff3jd',
    candidate: 'space_bunny',
    result: 'success',
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
    ids: ['rimewake', 'kintsugi_embers', 'reticle', 'blue_ice', 'loadstone', 'sirocco', 'cilia', 'sunlit_vitrail'],
  },
  {
    runId: '4cRctoZrXREvmK4',
    candidate: 'gpt_sol',
    result: 'success',
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
    ids: ['velvet_ovation', 'kiln_memory', 'infinite_cloister', 'sovereign_clock', 'glacial_psalm', 'palimpsest', 'viridian_choir', 'afterimage'],
  },
  {
    runId: '8EWpDkWx6nfkCqt',
    candidate: 'claude_sonnet',
    result: 'mixed',
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
    ids: ['gilded_tesserae', 'harlequin_kindling', 'nocturnal_mending', 'ctenophore_aurora', 'shot_silk_damask', 'cradle_of_suns', 'grand_complication', 'thousand_flowers'],
  },
] as const
const imported = batches.flatMap(batch => batch.ids.map(id => ({
  ...batch,
  id,
})))
const displaced = new Set<KnotId>([
  'basalt_crown',
  'ferro_tide',
  'rimewake',
  'kintsugi_embers',
  'reticle',
  'blue_ice',
  'loadstone',
  'sirocco',
  'cilia',
  'sunlit_vitrail',
  'palimpsest',
  'viridian_choir',
  'ctenophore_aurora',
])
describe('October Mage knot arrivals', () => {
  test('retains all thirty-two entries with exact model, effort and run provenance', async () => {
    expect(imported).toHaveLength(32)
    const ids = new Set(imported.map(entry => entry.id))
    const titles = new Set(imported.map(entry => knotsById.get(entry.id)!.title))
    expect(ids.size).toBe(32)
    expect(titles.size).toBe(32)
    expect(imported.filter(entry => entry.result === 'mixed')).toHaveLength(8)
    for (const {id, candidate, model, runId, result} of imported) {
      const entry = knotsById.get(id)!
      expect(entry.candidateId).toBe(candidate)
      expect(entry.author.model).toEqual(model)
      expect(entry.harness).toBe('Mage')
      // Review may change ratings later; that must not invalidate import provenance.
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
  test.each(imported)('constructs $id without taking ownership of the environment', async ({id}) => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let disposals = 0
    environment.addEventListener('dispose', () => disposals++)
    try {
      const material = new Material(environment)
      try {
        expect(material.name).toBe(id)
        expect(material.isMeshPhysicalNodeMaterial).toBe(true)
        expect(material.envMap).toBe(environment)
        expect(Boolean(material.positionNode)).toBe(displaced.has(id))
        expect(Boolean(knotsById.get(id)!.displacement)).toBe(displaced.has(id))
        if (displaced.has(id)) {
          expect(material.normalNode).not.toBeNull()
          const dependencies = new Set<Node>([material.positionNode!])
          for (const node of dependencies) {
            for (const child of node.getChildren()) {
              dependencies.add(child)
            }
          }
          // Reading these output varyings before displacement caches an undeformed clip position.
          expect(dependencies.has(positionView), id).toBe(false)
          expect(dependencies.has(positionViewDirection), id).toBe(false)
        }
      } finally {
        material.dispose()
      }
      expect(disposals).toBe(0)
    } finally {
      environment.dispose()
    }
  })
  test('preserves all six pre-existing collision identities', () => {
    for (const [existing, incoming] of [
      ['labrador_veil', 'feldspar_veil'],
      ['kintsugi', 'kintsugi_embers'],
      ['vitrail', 'sunlit_vitrail'],
      ['velvet_nocturne', 'velvet_ovation'],
      ['harlequin_opal', 'harlequin_kindling'],
      ['kintsugi_nocturne', 'nocturnal_mending'],
    ] as const) {
      const original = knotsById.get(existing)!
      const addition = knotsById.get(incoming)!
      expect(original).toBeDefined()
      expect(addition).toBeDefined()
      expect(original.title).not.toBe(addition.title)
      expect(original.flavorText).not.toBe(addition.flavorText)
    }
  })
  test('makes each complete batch reviewable through an exact ID whitelist', () => {
    for (const batch of batches) {
      const bays = selectKnotBays(`?knot_id=${batch.ids.join(',')}`)
      expect(bays).toHaveLength(1)
      expect(bays[0].candidate.data.id).toBe(batch.candidate)
      const ids = new Set(bays[0].finishes.map(entry => entry.id))
      expect(ids).toEqual(new Set(batch.ids))
      expect(bays[0].finishes.every(entry => entry.author.model.effortLevel === 'max')).toBe(true)
    }
  })
  test('bounds combined spike fields, sideways lean and accumulated noise octaves', () => {
    const [radius, tube] = knotGeometryArgs
    const maximumPointRadius = radius * 1.5 + tube
    const swelling = maximumPointRadius * (Math.hypot(2.1, -1.4, 1.7) + 0.45 * Math.hypot(-3.4, 2.6, 1.2)) * 0.004
    const spikes = (0.062 + 0.0195) * 0.85 * 1.22 * 1.15 * 1.04
    expect(knotsById.get('ferro_tide')!.displacement!).toBeGreaterThanOrEqual(swelling + spikes)
    const sheet = 1 + 0.5 + 0.25
    const normal = 0.046 + (sheet * 0.4 + 0.6) * 0.0022
    const sideways = Math.hypot(1, 0.35) * 0.019
    expect(knotsById.get('loadstone')!.displacement!).toBeGreaterThanOrEqual(Math.hypot(normal, sideways))
    expect(knotsById.get('reticle')!.displacement!).toBeGreaterThanOrEqual(0.0012 * (1 + 0.5))
    expect(knotsById.get('cilia')!.displacement!).toBeGreaterThanOrEqual(0.0012 * (1 + 0.5) + 0.0005)
  })
})
