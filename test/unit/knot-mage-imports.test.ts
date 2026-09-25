import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import {knotsById} from 'knot-materials'
import {Texture} from 'three/webgpu'

const runs = [
  ['2kVLNNiT7YsY7gP', 'space_bunny', 'abyssal_silk chrome_bloom cloisonne_cosmos iridescent_mycelium prismatic_opal solar_loom tectonic_dawn velvet_occultation'],
  ['1UqvleKScECZs6l', 'space_bunny', 'pawlight_atlas velvet_meridian cymatic_reliquary rose_transmission pallasite_heart nacre_revelation heartwood_vespers peacock_moon'],
  ['NKvaWYy8hA4AWQ9', 'grok', 'constellation_cattery soap_iridescence aurora_veins abalone_chamber velvet_nebula cinnabar_lacquer halo_caustic clockwork_eclipse'],
  ['4AEfQg7Qgj1dEVQ', 'gemini_flash', 'celestial_felines chrono_astrolabe living_kintsugi photonic_circuit siphonophore_procession smoky_opal scarab_armor gothic_vitrail'],
  ['IBraVE33noBp60D', 'gpt_sol', 'felis_major golden_fault captive_suns amber_aeons hoarfrost_canticle saffron_loom orrery_nocturne moth_atlas'],
  ['0CPX47Y7FuE0PTN', 'gpt_sol', 'feline_atlas pelagic_opal blue_hour_porcelain velvet_herbarium umbra_choir moth_lanterns parallax_palace winter_palace'],
  ['ActJg0bLJQHug14', 'space_bunny', 'pawprint_astrolabe comet_impasto cloisonne_requiem mercury_sea brocade_moon singing_sands glasswing_atlas frozen_orbit'],
] as const
const imported = runs.flatMap(([runId, candidateId, ids]) => ids.split(' ').map(id => ({
  runId,
  candidateId,
  id,
})))
describe('September 25 Mage knot imports', () => {
  test('registers eight distinct entries from each requested run', async () => {
    expect(imported).toHaveLength(56)
    expect(new Set(imported.map(entry => entry.id)).size).toBe(56)
    const counts = new Map<string, number>
    for (const entry of imported) {
      counts.set(entry.runId, (counts.get(entry.runId) ?? 0) + 1)
      const data = knotsById.get(entry.id)!
      expect(data).toBeDefined()
      expect(data.candidateId).toBe(entry.candidateId)
      expect(data.harness).toBe('Mage')
      const url = new URL(`../../packages/knot-materials/src/entries/${entry.id}/data.ts`, import.meta.url)
      expect(await Bun.file(url).text()).toContain(entry.runId)
    }
    expect(counts.size).toBe(7)
    expect(counts.values().every(count => count === 8)).toBe(true)
  })
  test.each(imported)('constructs $id with the caller-owned environment', async ({id}) => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let environmentDisposals = 0
    environment.addEventListener('dispose', () => {
      environmentDisposals++
    })
    try {
      const material = new Material(environment)
      expect(material.name).toBe(id)
      expect(material.envMap).toBe(environment)
      material.dispose()
      expect(environmentDisposals).toBe(0)
    } finally {
      environment.dispose()
    }
  })
  test('keeps existing identities separate from the incoming collisions', () => {
    for (const [existing, incoming] of [
      ['abyssal_siphonophore', 'siphonophore_procession'],
      ['prismatic_opal', 'smoky_opal'],
      ['scarab_chitin', 'scarab_armor'],
      ['velvet_eclipse', 'captive_suns'],
      ['liquid_mercury', 'mercury_sea'],
    ]) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
    expect(knotsById.get('liquid_mercury')!.title).toBe('Ferrofluid Bloom')
    expect(knotsById.get('mercury_sea')!.title).toBe('Liquid Mercury')
  })
})
