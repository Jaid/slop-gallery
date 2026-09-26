import type {KnotId, KnotMaterialModule} from '../src/types.ts'

import {describe, expect, test} from 'bun:test'
import {readdir, readFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

import {Color, MeshPhysicalNodeMaterial, Texture} from 'three/webgpu'

import createPlaceholderMaterial, {placeholderPresets} from '../src/createPlaceholderMaterial.ts'
import {entries, KnotCandidate, knotCandidates, knots, knotsById} from '../src/main.ts'
import rarities, {common, ethereal, prime, rare, unknown} from '../src/rarities.ts'

const root = fileURLToPath(new URL('../src', import.meta.url))
const source = (file: string) => readFile(resolve(root, file), 'utf8')
const tsFiles = async () => Array.fromAsync(new Bun.Glob('**/*.ts').scan(root))
describe('flat knot catalogue', () => {
  test('entry folders, metadata exports and rarity keys have exactly the same globally unique IDs', async () => {
    const folders = (await readdir(resolve(root, 'entries'), {withFileTypes: true})).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    const ids = knots.map(entry => entry.id).sort()
    expect(ids).toEqual(folders)
    expect(ids).toEqual(Object.keys(entries).sort())
    expect(ids).toEqual(Object.keys(rarities).sort())
    expect(knotsById.size).toBe(ids.length)
    expect(knotCandidates.flatMap(candidate => candidate.items)).toHaveLength(ids.length)
    expect(new Set(knotCandidates.map(candidate => candidate.data.id)).size).toBe(knotCandidates.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][0-9_a-z]*$/u)
      expect(await Bun.file(resolve(root, 'entries', id, 'Material.ts')).exists()).toBe(true)
      expect(await Bun.file(resolve(root, 'entries', id, 'data.ts')).exists()).toBe(true)
      expect((await Array.fromAsync(new Bun.Glob('**/*.ts').scan(resolve(root, 'entries', id)))).toSorted()).toEqual(['Material.ts', 'data.ts'])
      const materialSource = await source(`entries/${id}/Material.ts`)
      expect(materialSource).toContain('export default class extends')
      for (const jsdoc of materialSource.matchAll(/\/\*\*[\s\S]*?\*\//gu)) {
        if (!/(?:^|\n)\s*\*?\s*@\w+/u.test(jsdoc[0])) {
          expect(jsdoc[0]).not.toContain('\n')
        }
      }
      expect(knotsById.get(id)!.id).toBe(id)
    }
  })
  test('every entry has distinctive flavor text, typed placeholder metadata and preserved provenance', () => {
    const flavors = new Set<string>
    for (const entry of knots) {
      const data = entries[entry.id as KnotId]
      expect(entry.candidateId).toBe(data.candidateId)
      expect(entry.candidate.id).toBe(entry.candidateId)
      expect(entry.flavorText.trim().length).toBeGreaterThan(30)
      expect(entry.flavorText.trim()).toBe(entry.flavorText)
      expect(flavors.has(entry.flavorText)).toBe(false)
      flavors.add(entry.flavorText)
      expect(entry.placeholder.color).toMatch(/^#[\da-f]{6}$/iu)
      expect(Object.hasOwn(placeholderPresets, entry.placeholder.shading)).toBe(true)
      expect(entry.author.model.title.trim().length).toBeGreaterThan(0)
      for (const field of ['accent', 'highlighted', 'icon', 'sourceId', 'rarity', 'number']) {
        expect(field in data, `${entry.id}.${field}`).toBe(false)
      }
    }
  })
  test('rarity is exhaustive, separate from entry data, and drives selection before display ordering', () => {
    expect([unknown, common, rare, prime, ethereal]).toEqual([0, 1, 2, 3, 4])
    expect(rarities.chladni_resonance).toBe(ethereal)
    expect(rarities.lichtenberg_reliquary).toBe(prime)
    expect(rarities.washi_lantern).toBe(common)
    expect(new Set(Object.values(rarities))).toEqual(new Set([unknown, common, rare, prime, ethereal]))
    for (const candidate of knotCandidates) {
      const available = candidate.items.filter(entry => !entry.archived)
      const selected = candidate.select(3)
      expect(selected.map(entry => entry.rarity)).toEqual(selected.map(entry => entry.rarity).sort((a, b) => a - b))
      expect(selected.map(entry => entry.id).sort()).toEqual(available.toSorted((a, b) => b.rarity - a.rarity || a.id.localeCompare(b.id)).slice(0, 3).map(entry => entry.id).sort())
      expect(selected.every(entry => !entry.archived)).toBe(true)
    }
  })
  test('all material modules construct independently and respect caller-owned environment textures', async () => {
    const environment = new Texture
    let released = 0
    environment.addEventListener('dispose', () => released++)
    try {
      for (const entry of knots) {
        const {default: Material} = await import(pathToFileURL(resolve(root, 'entries', entry.id, 'Material.ts')).href) as KnotMaterialModule
        const material = new Material(environment)
        try {
          expect(material.name).toBe(entry.id)
          expect(material.envMap).toBe(environment)
          expect(material).toBeInstanceOf(MeshPhysicalNodeMaterial)
          expect(material.positionNode !== null).toBe(Boolean(entry.displacement))
        } finally {
          material.dispose()
        }
      }
      expect(released).toBe(0)
    } finally {
      environment.dispose()
    }
    expect(released).toBe(1)
  })
  test('the metadata entry point bundles without importing shaders or Three.js', async () => {
    const result = await Bun.build({
      entrypoints: [resolve(root, 'main.ts')],
      target: 'browser',
    })
    expect(result.success).toBe(true)
    const output = (await Promise.all(result.outputs.map(file => file.text()))).join('\n')
    expect(output).not.toContain('MeshPhysicalNodeMaterial')
    expect(output).not.toContain('three/tsl')
    expect(output).not.toContain('/Material.ts')
    expect(output).toContain('chladni_resonance')
  })
  test('the package has no imports into the application and shader helpers obey their ownership scopes', async () => {
    for (const file of await tsFiles()) {
      const normalized = file.replaceAll('\\', '/')
      const text = await source(file)
      expect(text).not.toContain('#src/')
      const fullPath = resolve(root, file)
      for (const match of text.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/gu)) {
        if (!match[1].startsWith('.')) {
          continue
        }
        const dependency = resolve(dirname(fullPath), match[1])
        expect(dependency.startsWith(`${root}\\`) || dependency.startsWith(`${root}/`), `${file}: ${match[1]}`).toBe(true)
        if (normalized.startsWith('lib/')) {
          expect(dependency.replaceAll('\\', '/')).not.toContain('/src/entries/')
          expect(dependency.replaceAll('\\', '/')).not.toContain('/src/candidates/')
        }
        const entryId = /^entries\/([^/]+)\//u.exec(normalized)?.[1]
        if (entryId) {
          const helperCandidate = /\/candidates\/([^/]+)\/lib\//u.exec(dependency.replaceAll('\\', '/'))?.[1]
          if (helperCandidate) {
            expect(helperCandidate).toBe(knotsById.get(entryId)!.candidateId)
          }
        }
      }
      if (normalized.endsWith('/Material.ts')) {
        expect(text).not.toMatch(/switch\s*\(\s*finish\s*\)/u)
      }
    }
  })
})
describe('placeholder presets', () => {
  test('all seven presets preserve color and can render without constructing an entry material', () => {
    const environment = new Texture
    try {
      for (const shading of Object.keys(placeholderPresets) as Array<keyof typeof placeholderPresets>) {
        for (const quality of [false, true]) {
          const material = createPlaceholderMaterial({
            color: '#d45e91',
            shading,
          }, quality, quality ? environment : undefined)
          try {
            expect(material.color.getHexString()).toBe(new Color('#d45e91').getHexString())
            expect(material.isMeshStandardNodeMaterial).toBe(true)
            expect(material instanceof MeshPhysicalNodeMaterial).toBe(quality)
            expect(material.envMap).toBe(quality ? environment : null)
            if (shading === 'ghost') {
              expect(material.transparent).toBe(true)
              expect(material.opacity).toBe(0.34)
            }
            if (shading === 'metal') {
              expect(material.metalness).toBe(0.9)
            }
            if (shading === 'stone') {
              expect(material.flatShading).toBe(true)
            }
            if (material instanceof MeshPhysicalNodeMaterial) {
              if (shading === 'glass') {
                expect(material.transmission).toBe(0.86)
                expect(material.transparent).toBe(false)
              }
              if (shading === 'fabric') {
                expect(material.sheen).toBe(1)
              }
              if (shading === 'liquid') {
                expect(material.clearcoat).toBe(1)
              }
            }
          } finally {
            material.dispose()
          }
        }
      }
    } finally {
      environment.dispose()
    }
  })
})
test('missing rarity cannot be satisfied by an inherited object property', () => {
  const original = knots[0]
  for (const id of ['missing_entry', 'constructor']) {
    expect(() => new KnotCandidate(original.candidate, [{
      ...original,
      id,
    }])).toThrow('Missing Knot rarity')
  }
})
