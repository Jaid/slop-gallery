import {describe, expect, test} from 'bun:test'

import {knotsById} from '../src/main.ts'

// Successful Mage sessions only; mixed and unfinished sessions are not gallery submissions.
const batches = [
  {
    run: 'run-2026-09-22_04-33-27/preset-mimo_knot-material-shaders',
    candidateId: 'mimo',
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
    ids: [
      'hadal_garden',
      'amber_reliquary',
      'glacier_veil',
      'gilded_scars',
      'nacre',
      'gilded_mercury',
      'vesper_rose',
      'velvet_hush',
    ],
  },
  {
    run: 'run-2026-09-22_06-42-53/gpt-6-astra_knot-material-shaders',
    candidateId: 'gpt_astra',
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
    ids: [
      'aureate_loom',
      'carmine_fold',
      'dune_psalm',
      'nacre_reverie',
      'pavonine_vow',
      'porcelain_atlas',
      'prism_archive',
      'sidereal_orrery',
    ],
  },
  {
    run: 'run-2026-09-22_06-43-18/gpt-5-6-sol_knot-material-shaders',
    candidateId: 'gpt_sol',
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
    ids: [
      'aurora_ice',
      'midnight_prophecy',
      'mosslight_garden',
      'oracle_palimpsest',
      'rosefire_mosaic',
      'seraph_plumage',
      'tidal_atlas',
      'umbra_procession',
    ],
  },
  {
    run: 'run-2026-09-22_06-43-25/gpt-6-astra_knot-material-shaders',
    candidateId: 'gpt_astra',
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
    ids: [
      'blue_hour',
      'glacier_script',
      'heartwood_atlas',
      'magnetic_tide',
      'mycelial_lace',
      'harmonic_seal',
      'selvedge_nocturne',
      'vesper_glass',
    ],
  },
  {
    run: 'run-2026-09-22_07-42-05/gpt-5-6-terra_knot-material-shaders',
    candidateId: 'gpt_terra',
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
    ids: [
      'bismuth_garden',
      'cinder_bloom',
      'frost_oracle',
      'gilded_sumi',
      'mycelial_constellation',
      'nacre_psalm',
      'quasar_silk',
      'crescent_velvet',
    ],
  },
  {
    run: 'run-2026-09-22_12-03-23/grok-4-7_knot-material-shaders',
    candidateId: 'grok',
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
    ids: [
      'aurora_loom',
      'basalt_psalm',
      'cinnabar_kiln',
      'glacier_memory',
      'mercury_script',
      'moth_reliquary',
      'nacre_tide',
      'soap_cathedral',
    ],
  },
  {
    run: 'run-2026-09-22_13-24-56/gpt-6-astra_knot-material-shaders',
    candidateId: 'gpt_astra',
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
    ids: [
      'nacre_nocturne',
      'moth_regent',
      'amber_archive',
      'crimson_loom',
      'petal_testament',
      'verdant_oath',
      'chromatic_fugue',
      'porifera',
    ],
  },
] as const
describe('September 22 Mage arrivals', () => {
  test('keeps all 56 submissions and their actual inference provenance', () => {
    const ids = batches.flatMap(batch => [...batch.ids])
    expect(batches).toHaveLength(7)
    expect(ids).toHaveLength(56)
    expect(new Set(ids).size).toBe(ids.length)
    for (const batch of batches) {
      expect(batch.ids).toHaveLength(8)
      for (const id of batch.ids) {
        const entry = knotsById.get(id)!
        expect(entry).toBeDefined()
        expect(entry.candidateId).toBe(batch.candidateId)
        expect(entry.harness).toBe('Mage')
        expect(entry.author.model).toEqual(batch.model)
      }
    }
  })
  test('renames colliding submissions instead of replacing existing exhibits', () => {
    const collisions = [
      [
        'amber_herbarium',
        'amber_archive',
      ],
      [
        'abyssal_bloom',
        'hadal_garden',
      ],
      [
        'aurora_veil',
        'glacier_veil',
      ],
      [
        'quicksilver',
        'gilded_mercury',
      ],
      [
        'rose_window',
        'vesper_rose',
      ],
      [
        'kintsugi_oracle',
        'midnight_prophecy',
      ],
      [
        'velvet_eclipse',
        'umbra_procession',
      ],
      [
        'prism_archive',
        'harmonic_seal',
      ],
      [
        'velvet_eclipse',
        'crescent_velvet',
      ],
    ] as const
    for (const [originalId, newId] of collisions) {
      const original = knotsById.get(originalId)!
      const arrival = knotsById.get(newId)!
      expect(original).toBeDefined()
      expect(arrival).toBeDefined()
      expect(arrival.title).not.toBe(original.title)
      expect(arrival.flavorText).not.toBe(original.flavorText)
    }
  })
  test('ships a JPEG XL icon for every submission', async () => {
    for (const id of batches.flatMap(batch => [...batch.ids])) {
      const file = Bun.file(new URL(`../src/entries/${id}/icon.jxl`, import.meta.url))
      expect(await file.exists(), id).toBe(true)
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
      const codestream = bytes[0] === 0xFF && bytes[1] === 0x0A
      const container = bytes.length === 12 && [0, 0, 0, 12, 0x4A, 0x58, 0x4C, 0x20, 13, 10, 0x87, 10].every((value, index) => bytes[index] === value)
      expect(codestream || container, id).toBe(true)
    }
  })
})
