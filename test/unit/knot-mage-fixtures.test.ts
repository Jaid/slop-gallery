import type {KnotMaterialConstructor} from 'knot-materials/types.ts'
import type {DataTexture} from 'three/webgpu'

import {describe, expect, test} from 'bun:test'

import fs from 'fs-extra'
import {knotsById} from 'knot-materials'
import {DataUtils, HalfFloatType, Texture} from 'three/webgpu'

const runs = [
  ['9YA8kP6cid9wkS5', 'space_bunny', 'knot-material-shaders', 'damascus_steel kintsugi_twilight nacre_dream abyssal_coral cloisonne_kingdoms tectonic_ember phantom_weave amber_echo'],
  ['BJsZFlj5mQPSiFo', 'space_bunny', 'knot-material-shaders', 'moire_satin oceanic_nacre mycelial_lumen kintsugi_nebula tidal_glass vermillion_lacquer moonstone_dune tourmaline_nebula'],
  ['5W8F3T3KQWmthBY', 'gpt_astra', 'knot-material-br11k', 'the_ninth_sky'],
  ['6DDBpP8yOciMaq1', 'gpt_astra', 'knot-material-br11k', 'felis_noctiluca'],
  ['7MpiHPKoZbL8ZDK', 'gpt_astra', 'knot-material-br11k', 'felis_astra'],
  ['AywadB8L9RF1tw9', 'gpt_sol', 'knot-material-br11k', 'felis_noctis'],
  ['DyugOIRGq3AJL3h', 'gpt_sol', 'knot-material-br11k', 'felidae_nocturne'],
  ['29lWdAQmWzVXPwF', 'gpt_sol', 'knot-material-br11k', 'aster_familiar'],
  ['OHrguQnRmnE9qcL', 'gpt_astra', 'knot-material-br11k', 'aster_purr'],
  ['8pqCoRj0a4a532V', 'gpt_astra', 'knot-material-br11k', 'asterlynx'],
  ['LLppyomyYFyJXNM', 'gpt_astra', 'knot-material-br11k', 'purrallax'],
  ['DwSASUlaGpPBz8y', 'gpt_astra', 'knot-material-br11k', 'aster_gaze'],
] as const
const authors = {
  space_bunny: {
    title: 'Space Bunny Alpha',
    slug: 'stealth/space-bunny-alpha',
    effortLevel: 'max',
  },
  gpt_astra: {
    title: 'GPT-6 Astra',
    slug: 'openai/gpt-6-astra',
    effortLevel: 'high',
  },
  gpt_sol: {
    title: 'GPT-6 Sol',
    slug: 'openai/gpt-6-sol',
    effortLevel: 'xhigh',
  },
} as const
const imported = runs.flatMap(([runId, candidateId, fixture, ids]) => ids.split(' ').map(id => ({
  runId,
  candidateId,
  fixture,
  id,
})))
const textured = new Set(['the_ninth_sky', 'felis_astra', 'felidae_nocturne'])
describe('Mage shader and br11k fixture imports', () => {
  test('registers every requested entry with actual run and model provenance', async () => {
    expect(imported).toHaveLength(26)
    const identities = new Set(imported.map(entry => entry.id))
    expect(identities.size).toBe(imported.length)
    expect(runs.filter(([, , fixture]) => fixture === 'knot-material-shaders')).toHaveLength(2)
    expect(runs.filter(([, , fixture]) => fixture === 'knot-material-br11k')).toHaveLength(10)
    for (const {id, runId, candidateId, fixture} of imported) {
      const entry = knotsById.get(id)!
      expect(entry).toBeDefined()
      expect(entry.candidateId).toBe(candidateId)
      expect(entry.author.model).toEqual(authors[candidateId])
      expect(entry.harness).toBe('Mage')
      expect(entry.placeholder.color).toMatch(/^#[0-9a-f]{6}$/u)
      const folder = new URL(`../../packages/knot-materials/src/entries/${id}/`, import.meta.url)
      const entryFiles = await fs.readdir(folder)
      expect(entryFiles.toSorted()).toEqual(['Material.ts', 'data.ts'])
      const source = await Bun.file(new URL('data.ts', folder)).text()
      expect(source).toContain(runId)
      expect(source).toContain(fixture)
    }
  })
  test.each(imported)('constructs $id and releases only its own textures', async ({id}) => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let environmentDisposals = 0
    environment.addEventListener('dispose', () => environmentDisposals++)
    try {
      const material = new Material(environment)
      const atlas = (material as unknown as {atlas?: DataTexture}).atlas
      let atlasDisposals = 0
      atlas?.addEventListener('dispose', () => atlasDisposals++)
      try {
        expect(material.name).toBe(id)
        expect(material.envMap).toBe(environment)
        expect(material.isMeshPhysicalNodeMaterial).toBe(true)
        expect(material.map).toBeNull()
        if (knotsById.get(id)!.displacement) {
          expect(material.positionNode).not.toBeNull()
          expect(material.normalNode).not.toBeNull()
        } else {
          expect(material.positionNode).toBeNull()
        }
        expect(Boolean(atlas)).toBe(textured.has(id))
        if (atlas) {
          expect(atlas.isDataTexture).toBe(true)
          const image = atlas.image as {
            data: Uint8Array | Uint16Array
            height: number
            width: number
          }
          expect(image.data.length).toBe(image.width * image.height * 4)
          expect(image.data.some(value => value !== 0)).toBe(true)
          if (atlas.type === HalfFloatType) {
            expect(image.data.every(value => Number.isFinite(DataUtils.fromHalfFloat(value)))).toBe(true)
          }
        }
      } finally {
        material.dispose()
      }
      expect(atlasDisposals).toBe(atlas ? 1 : 0)
      expect(environmentDisposals).toBe(0)
    } finally {
      environment.dispose()
    }
  }, 20_000)
  test('preserves separate identities for all four incoming collisions', () => {
    for (const [existing, incoming] of [
      ['kintsugi', 'kintsugi_twilight'],
      ['nacre_shell', 'nacre_dream'],
      ['cloisonne', 'cloisonne_kingdoms'],
      ['abyssal_nacre', 'oceanic_nacre'],
    ]) {
      expect(knotsById.has(existing)).toBe(true)
      expect(knotsById.has(incoming)).toBe(true)
      expect(knotsById.get(existing)!.title).not.toBe(knotsById.get(incoming)!.title)
    }
    expect(knotsById.get('nacre_shell')!.title).toBe('Nacre Shell')
    expect(knotsById.get('nacre_dream')!.title).toBe('Nacre Dream')
  })
  test('keeps both independently generated Aster Purr implementations', () => {
    expect(knotsById.get('aster_purr')!.title).toBe('Aster Purr')
    expect(knotsById.get('aster_gaze')!.title).toBe('Aster Gaze')
    expect(knotsById.get('aster_purr')!.flavorText).not.toBe(knotsById.get('aster_gaze')!.flavorText)
  })
})
