import type {KnotCandidateData, KnotData} from '../../src/lib/knots/types.ts'

import {describe, expect, test} from 'bun:test'

import {enumerateKnotBays, formatKnotLabels, selectKnotBays} from '../../src/lib/knots/exhibition.ts'
import {knotCandidates, knots, knotsById} from '../../src/lib/knots/index.ts'
import KnotCandidate, {indexKnots} from '../../src/lib/knots/KnotCandidate.ts'

const candidateData: KnotCandidateData = {
  id: 'fable',
  title: 'Claude Fable',
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
      item('alpha'),
      {
        ...item('beta', true),
        archived: true,
      },
      item('gamma'),
    ])
    expect(ids(candidate)).toEqual(['alpha', 'gamma'])
    expect(candidate.items).toHaveLength(3)
  })
  test('rejects invalid identifiers, duplicate IDs and displacement bounds', () => {
    expect(() => new KnotCandidate({
      ...candidateData,
      id: '../fable',
    }, [])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [
      {
        ...item('alpha'),
        id: '../other',
      },
    ])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [item('alpha'), item('alpha')])).toThrow('ID')
    for (const displacement of [-1, Number.NaN, Infinity]) {
      expect(() => new KnotCandidate(candidateData, [
        {
          ...item('alpha'),
          displacement,
        },
      ])).toThrow('displacement')
    }
    expect(() => new KnotCandidate(candidateData, [
      {
        ...item('alpha'),
        author: {model: {title: ' '}},
      },
    ])).toThrow('author')
  })
  test('indexes by stable full ID and rejects duplicate candidate IDs', () => {
    const a = new KnotCandidate(candidateData, [item('alpha')])
    const b = new KnotCandidate({
      ...candidateData,
      id: 'astra',
    }, [item('alpha')])
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
        expect(await Bun.file(`src/lib/knots/${entry.candidate.id}/items/${entry.sourceId}/material.ts`).exists()).toBe(true)
        const dataSource = await Bun.file(`src/lib/knots/${entry.candidate.id}/items/${entry.sourceId}/data.ts`).text()
        expect(dataSource).not.toMatch(/\bnumber\s*:/u)
      }
    }
    const materialFiles = await Array.fromAsync(new Bun.Glob('src/lib/knots/*/items/*/material.ts').scan('.'))
    expect(new Set(materialFiles.map(path => path.replaceAll('\\', '/')))).toEqual(new Set(knots.map(entry => `src/lib/knots/${entry.candidate.id}/items/${entry.sourceId}/material.ts`)))
    expect(knotsById.size).toBe(knots.length)
  })
  test('uses candidate titles independently from author model titles', () => {
    expect(Object.fromEntries(knotCandidates.map(candidate => [candidate.data.id, candidate.data.title]))).toMatchObject({
      astra: 'GPT Astra',
      fable: 'Claude Fable',
      gemini: 'Gemini Flash',
      glm: 'GLM',
      glm_flash: 'GLM Flash',
      grok: 'Grok',
      hunyuan: 'Hy',
      kimi: 'Kimi',
      muse: 'Muse Spark',
      qwen: 'Qwen Max',
      sol: 'GPT Sol',
      sonnet: 'Claude Sonnet',
    })
    expect(knotCandidates.find(candidate => candidate.data.id === 'fable')!.items.every(entry => entry.modelTitle === 'Claude Fable 5.1')).toBe(true)
  })
  test('collapses effort labels and spelling variants into one model identity', () => {
    const kimi = knotCandidates.find(candidate => candidate.data.id === 'kimi')!
    expect(new Set(kimi.items.map(entry => entry.modelTitle))).toEqual(new Set(['Kimi K3']))
    expect(kimi.items.filter(entry => entry.harness === 'kimi.ai')).toHaveLength(8)
    expect(kimi.items.filter(entry => entry.harness === 'kimi.ai').every(entry => entry.author.model.effortLevel === 'max')).toBe(true)
    const qwen = knotCandidates.find(candidate => candidate.data.id === 'qwen')!
    expect(new Set(qwen.items.map(entry => entry.modelTitle))).toEqual(new Set(['Qwen 3.8 Max']))
  })
  test('keeps every Gemini item on current model provenance', () => {
    const gemini = knotCandidates.find(candidate => candidate.data.id === 'gemini')!
    expect(gemini.items).toHaveLength(24)
    expect(gemini.items.every(entry => entry.author.model.title === 'Gemini 3.8 Flash'
      && entry.author.model.slug === 'google/gemini-3.8-flash'
      && entry.author.model.effortLevel === 'high'
      && entry.harness === 'none')).toBe(true)
  })
  test('keeps batch model credits and displacement metadata by stable identity', () => {
    const expected = [
      ['DeepSeek 4.1 Flash', 'deepseek/deepseek-v4.1-flash', 'max'],
      ['Muse Spark 1.3', 'meta/muse-spark-1.3-contributor', 'xhigh'],
      ['GLM 5.3 Flash', 'z-ai/glm-5.3-flash', 'max'],
      ['Hy4 Preview', 'tencent/hy4-preview', 'high'],
    ] as const
    for (const [title, slug, effortLevel] of expected) {
      const entries = knots.filter(entry => entry.author.model.slug === slug)
      expect(entries).toHaveLength(8)
      expect(entries.every(entry => entry.author.model.title === title && entry.author.model.effortLevel === effortLevel)).toBe(true)
    }
    expect(byId('deepseek/quantum_foam_2').archived).toBe(true)
    expect(byId('muse/abyssal_bloom').displacement).toBe(0.02)
    expect(byId('fable/chladni_resonance').displacement).toBe(0.006)
    expect(byId('gemini/magma_chrysalis_2').displacement).toBe(0.018)
    expect(byId('astra/ferrothorn').displacement).toBe(0.048)
    expect(byId('astra/folded_silence').displacement).toBe(0.048)
    expect(byId('sol/magnetite_field').displacement).toBe(0.046)
    expect(byId('sol/chromatophore_skin').displacement).toBe(0.014)
  })
  test('records API, Codex and web-chat harness provenance without guessing legacy sources', () => {
    const api = knots.filter(entry => entry.author.model.slug && entry.harness === 'none')
    const codex = knots.filter(entry => entry.harness === 'Codex')
    const webChat = knots.filter(entry => !entry.author.model.slug && entry.harness && entry.harness !== 'Codex')
    const legacy = knots.filter(entry => !entry.author.model.slug && !entry.harness)
    expect(api).toHaveLength(96)
    expect(codex).toHaveLength(17)
    expect(webChat).toHaveLength(56)
    expect(legacy).toHaveLength(56)
    expect(api.every(entry => entry.harness === 'none')).toBe(true)
    expect(codex.every(entry => entry.candidate.id === 'astra')).toBe(true)
    expect(legacy.every(entry => entry.harness === undefined)).toBe(true)
    const astraApi = api.filter(entry => entry.candidate.id === 'astra')
    const fableApi = api.filter(entry => entry.candidate.id === 'fable')
    const solApi = api.filter(entry => entry.candidate.id === 'sol')
    expect(astraApi).toHaveLength(8)
    expect(fableApi).toHaveLength(16)
    expect(solApi).toHaveLength(8)
    expect(astraApi.every(entry => entry.author.model.slug === 'openai/gpt-6-astra' && entry.author.model.effortLevel === 'max')).toBe(true)
    expect(fableApi.every(entry => entry.author.model.slug === 'anthropic/claude-fable-5.1' && entry.author.model.effortLevel === 'max')).toBe(true)
    expect(solApi.every(entry => entry.author.model.slug === 'openai/gpt-5.6-sol' && entry.author.model.effortLevel === 'max')).toBe(true)
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
  test('defaults to eight shots per candidate when the URL omits shots', () => {
    const bays = selectKnotBays('?candidates=fable,astra')
    expect(bays.map(bay => [bay.candidate.data.id, bay.finishes.length])).toEqual([['astra', 8], ['fable', 8]])
  })
  test('filters candidates, caps shots and enumerates only after final selection', () => {
    const bays = selectKnotBays('?candidates=glm,muse,qwen,astra&shots=2')
    expect(bays.map(bay => bay.candidate.data.id)).toEqual(['astra', 'glm', 'qwen', 'muse'])
    expect(bays.flatMap(bay => bay.finishes)).toHaveLength(8)
    expect(bays.every(bay => bay.finishes.length === 2 && bay.finishes.every(entry => entry.candidate.id === bay.candidate.data.id))).toBe(true)
    const numbered = enumerateKnotBays(bays)
    expect(numbered.flatMap(bay => bay.finishes.map(entry => entry.number))).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    const astra = enumerateKnotBays(selectKnotBays('?candidates=astra&shots=3'))
    expect(astra[0].finishes).toHaveLength(3)
    expect(astra[0].finishes.map(entry => entry.number)).toEqual([1, 2, 3])
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
    const glmFlash = knotCandidates.find(candidate => candidate.data.id === 'glm_flash')!
    expect(glm.data.title).toBe('GLM')
    expect(glmFlash.data.title).toBe('GLM Flash')
    expect(glm.items).toHaveLength(24)
    expect(glmFlash.items).toHaveLength(8)
    expect(glm.items.every(entry => entry.author.model.title !== 'GLM 5.3 Flash')).toBe(true)
    expect(glmFlash.items.every(entry => entry.author.model.slug === 'z-ai/glm-5.3-flash')).toBe(true)
    const glmOpenRouter = glm.items.filter(entry => entry.author.model.slug === 'z-ai/glm-5.3')
    expect(glmOpenRouter).toHaveLength(8)
    expect(glmOpenRouter.every(entry => entry.archived !== true)).toBe(true)
  })
})
