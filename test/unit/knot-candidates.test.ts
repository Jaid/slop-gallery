import type {KnotCandidateData, KnotData} from '../../src/lib/knots/types.ts'

import {describe, expect, test} from 'bun:test'

import {enumerateKnotBays, formatKnotLabels, selectKnotBays} from '../../src/lib/knots/exhibition.ts'
import {knotCandidates, knots, knotsById} from '../../src/lib/knots/index.ts'
import KnotCandidate, {indexKnots} from '../../src/lib/knots/KnotCandidate.ts'

const candidateData: KnotCandidateData = {
  id: 'fable',
  title: 'Claude Fable 5.1',
  icon: 'icon.jxl',
}
const item = (id: string, highlighted = false): KnotData => ({
  id,
  title: id.replaceAll('_', ' '),
  accent: '#fff',
  icon: 'icon.jxl',
  author: {model: {title: 'Claude Fable 5.1'}},
  highlighted,
})
const ids = (candidate: KnotCandidate) => candidate.select().map(entry => entry.sourceId)
const byId = (id: string) => knotsById.get(id)!

describe('arbitrary Knot batches', () => {
  test('places highlighted entries at the far end while using them first for shot limits', () => {
    const items = [item('zeta'), item('beta', true), item('alpha'), item('gamma', true), item('delta')]
    const expected = ['alpha', 'delta', 'zeta', 'beta', 'gamma']
    expect(ids(new KnotCandidate(candidateData, items))).toEqual(expected)
    expect(ids(new KnotCandidate(candidateData, items.toReversed()))).toEqual(expected)
    const limited = new KnotCandidate(candidateData, items).select(3)
    expect(limited.map(entry => entry.sourceId)).toEqual(['alpha', 'beta', 'gamma'])
    expect(limited.map(entry => entry.highlighted)).toEqual([false, true, true])
    expect(() => new KnotCandidate(candidateData, items).select(0)).toThrow('shot limit')
  })

  test('handles empty and partial rows without padding or reintroducing archives', () => {
    expect(ids(new KnotCandidate(candidateData, []))).toEqual([])
    const candidate = new KnotCandidate(candidateData, [
      item('alpha'), {
        ...item('beta', true),
        archived: true,
      }, item('gamma'),
    ])
    expect(ids(candidate)).toEqual(['alpha', 'gamma'])
    expect(candidate.items).toHaveLength(3)
  })

  test('rejects invalid identifiers, duplicate IDs and displacement bounds', () => {
    expect(() => new KnotCandidate({...candidateData, id: '../fable'}, [])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [{...item('alpha'), id: '../other'}])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [item('alpha'), item('alpha')])).toThrow('ID')
    for (const displacement of [-1, Number.NaN, Infinity]) {
      expect(() => new KnotCandidate(candidateData, [{...item('alpha'), displacement}])).toThrow('displacement')
    }
    expect(() => new KnotCandidate(candidateData, [{...item('alpha'), author: {model: {title: ' '}}}])).toThrow('author')
  })

  test('indexes by stable full ID and rejects duplicate candidate IDs', () => {
    const a = new KnotCandidate(candidateData, [item('alpha')])
    const b = new KnotCandidate({...candidateData, id: 'astra'}, [item('alpha')])
    expect([...indexKnots([a, b]).keys()]).toEqual(['fable/alpha', 'astra/alpha'])
    expect(() => indexKnots([a, a])).toThrow('candidate')
  })

  test('item metadata has no persisted plate numbers or billboard overviews', async () => {
    for (const candidate of knotCandidates) {
      const barrel = await import(`../../src/lib/knots/${candidate.data.id}/index.ts`)
      expect(Object.keys(barrel)).toHaveLength(candidate.items.length + 1)
      expect('overview' in candidate.data).toBe(false)
      for (const entry of candidate.items) {
        expect(barrel[entry.sourceId].id).toBe(entry.sourceId)
        expect('number' in barrel[entry.sourceId]).toBe(false)
        expect(await Bun.file(`src/lib/knots/${entry.model}/items/${entry.sourceId}/material.ts`).exists()).toBe(true)
        const dataSource = await Bun.file(`src/lib/knots/${entry.model}/items/${entry.sourceId}/data.ts`).text()
        expect(dataSource).not.toMatch(/\bnumber\s*:/u)
      }
    }
    const materialFiles = await Array.fromAsync(new Bun.Glob('src/lib/knots/*/items/*/material.ts').scan('.'))
    expect(new Set(materialFiles.map(path => path.replaceAll('\\', '/')))).toEqual(new Set(knots.map(entry => `src/lib/knots/${entry.model}/items/${entry.sourceId}/material.ts`)))
    expect(knotsById.size).toBe(knots.length)
  })

  test('groups model versions without losing per-item author fidelity', () => {
    const gemini = knotCandidates.find(candidate => candidate.data.id === 'gemini')!
    expect(gemini.items).toHaveLength(16)
    const original = byId('gemini/superfluid_vortex')
    const latest = byId('gemini/cyber_kintsugi')
    expect(original.author.model).toEqual({title: 'Gemini 3.6 Flash'})
    expect(latest.author.model).toEqual({
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    })
    expect(original.modelTitle).toBe(original.author.model.title)
    expect(latest.modelTitle).toBe(latest.author.model.title)
    expect(original.modelIcon).toBe(latest.modelIcon)
  })

  test('keeps batch model credits and displacement metadata by stable identity', () => {
    const expected = [
      ['DeepSeek 4.1 Flash', 'deepseek/deepseek-v4.1-flash', 'max'],
      ['Muse Spark 1.3', 'meta/muse-spark-1.3-contributor', 'xhigh'],
      ['GLM 5.3 Flash', 'z-ai/glm-5.3-flash', 'max'],
      ['HY4 Preview', 'tencent/hy4-preview', 'high'],
    ] as const
    for (const [title, slug, effortLevel] of expected) {
      const entries = knots.filter(entry => entry.author.model.slug === slug)
      expect(entries).toHaveLength(8)
      expect(entries.every(entry => entry.author.model.title === title && entry.author.model.effortLevel === effortLevel)).toBe(true)
    }
    expect(byId('deepseek/quantum_foam_2').archived).toBe(true)
    expect(byId('muse/abyssal_bloom').displacement).toBe(0.02)
    expect(byId('fable/chladni_resonance').displacement).toBe(0.006)
  })

  test('records OpenRouter, Codex and web-chat harness provenance without guessing legacy sources', () => {
    const astra = knots.filter(entry => entry.model === 'astra')
    const openRouter = knots.filter(entry => entry.model !== 'astra' && entry.author.model.slug)
    const webChat = knots.filter(entry => entry.model !== 'astra' && !entry.author.model.slug && entry.harness)
    const legacy = knots.filter(entry => entry.model !== 'astra' && !entry.author.model.slug && !entry.harness)
    expect(astra).toHaveLength(17)
    expect(openRouter).toHaveLength(64)
    expect(webChat).toHaveLength(56)
    expect(legacy).toHaveLength(64)
    expect(astra.every(entry => entry.harness === 'Codex')).toBe(true)
    expect(openRouter.every(entry => entry.harness === 'none')).toBe(true)
    expect(legacy.every(entry => entry.harness === undefined)).toBe(true)
    expect(Object.fromEntries(['chat.z.ai', 'grok.com Build', 'grok.com', 'kimi.ai', 'meta.ai', 'chat.qwen.ai', 'chat.deepseek.com'].map(harness => [harness, webChat.filter(entry => entry.harness === harness).length]))).toEqual({
      'chat.z.ai': 8,
      'grok.com Build': 8,
      'grok.com': 8,
      'kimi.ai': 8,
      'meta.ai': 8,
      'chat.qwen.ai': 8,
      'chat.deepseek.com': 8,
    })
  })

  test('filters candidates, caps shots and enumerates only after final selection', () => {
    const bays = selectKnotBays('?candidates=glm,gemini&shots=2')
    expect(bays.map(bay => bay.candidate.data.id)).toEqual(['gemini', 'glm'])
    expect(bays.map(bay => bay.finishes.map(entry => entry.sourceId))).toEqual([['bismuth_singularity', 'superfluid_vortex'], ['abyssal_choir', 'hourglass_heart']])
    const numbered = enumerateKnotBays(bays)
    expect(numbered.flatMap(bay => bay.finishes.map(entry => entry.number))).toEqual([1, 2, 3, 4])
    expect(numbered.flatMap(bay => bay.finishes).filter(entry => entry.highlighted).map(entry => entry.sourceId)).toEqual(['superfluid_vortex', 'hourglass_heart'])
    const astra = enumerateKnotBays(selectKnotBays('?candidates=astra&shots=3'))
    expect(astra[0].finishes.map(entry => entry.number)).toEqual([1, 2, 3])
    expect(astra[0].finishes.map(entry => entry.sourceId)).toEqual(['abyssal_lantern', 'coralline_crown', 'lenticular_mirage'])
    expect(() => selectKnotBays('?shots=0')).toThrow('shots')
    expect(() => selectKnotBays('?candidates=missing')).toThrow('candidate')
  })

  test('formats runtime number sequences compactly', () => {
    expect(formatKnotLabels([])).toBe('')
    expect(formatKnotLabels([1])).toBe('#01')
    expect(formatKnotLabels([1, 2, 3])).toBe('#01–#03')
    expect(formatKnotLabels([1, 3, 4])).toBe('#01 · #03 · #04')
  })

  test('keeps the second Fable batch and new GLM batch identifiable without plate numbers', () => {
    const fable = knotCandidates.find(candidate => candidate.data.id === 'fable')!
    expect(fable.items).toHaveLength(16)
    const fableOpenRouter = fable.items.filter(entry => entry.author.model.slug === 'anthropic/claude-fable-5.1')
    expect(fableOpenRouter).toHaveLength(16)
    expect(fableOpenRouter.every(entry => entry.harness === 'none')).toBe(true)
    expect(byId('fable/chladni_resonance').displacement).toBe(0.006)

    const glm = knotCandidates.find(candidate => candidate.data.id === 'glm')!
    expect(glm.items).toHaveLength(32)
    const glmOpenRouter = glm.items.filter(entry => entry.author.model.slug === 'z-ai/glm-5.3')
    expect(glmOpenRouter).toHaveLength(8)
    expect(glmOpenRouter.every(entry => !entry.highlighted && entry.archived !== true)).toBe(true)
    expect(byId('glm/hourglass_heart').highlighted).toBe(true)
  })
})
