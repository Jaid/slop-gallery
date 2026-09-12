import type {KnotCandidateData, KnotData} from '../../src/lib/knots/types.ts'

import {describe, expect, test} from 'bun:test'

import {formatKnotLabels, selectKnotBays} from '../../src/lib/knots/exhibition.ts'
import {knotCandidates, knots} from '../../src/lib/knots/index.ts'
import KnotCandidate, {indexKnots} from '../../src/lib/knots/KnotCandidate.ts'

const candidateData: KnotCandidateData = {
  id: 'fable',
  title: 'Claude Fable 5.1',
  icon: 'icon.jxl',
  overview: 'overview.jxl',
}
const item = (number: number, highlighted = false): KnotData => ({
  id: `item_${number}`,
  number,
  title: `Knot ${number}`,
  accent: '#fff',
  icon: 'icon.jxl',
  author: {model: {title: 'Claude Fable 5.1'}},
  highlighted,
})
const numbers = (candidate: KnotCandidate) => candidate.select().map(item => item.number)
const catalogNumbers = (candidate: KnotCandidate) => candidate.items.map(item => item.number).toSorted((a, b) => a - b)
describe('arbitrary Knot batches', () => {
  test('places highlighted entries at the far end while using them first for shot limits', () => {
    const items = [item(1), item(2, true), item(3), item(4, true), item(5)]
    const expected = [1, 3, 5, 2, 4]
    expect(numbers(new KnotCandidate(candidateData, items))).toEqual(expected)
    expect(numbers(new KnotCandidate(candidateData, items.toReversed()))).toEqual(expected)
    const limited = new KnotCandidate(candidateData, items).select(3)
    expect(limited.map(item => item.number)).toEqual([1, 2, 4])
    expect(limited.map(item => item.highlighted)).toEqual([false, true, true])
    expect(() => new KnotCandidate(candidateData, items).select(0)).toThrow('shot limit')
  })
  test('handles empty and partial rows without padding or reintroducing archives', () => {
    expect(numbers(new KnotCandidate(candidateData, []))).toEqual([])
    const candidate = new KnotCandidate(candidateData, [
      item(1), {
        ...item(2, true),
        archived: true,
      }, item(3),
    ])
    expect(numbers(candidate)).toEqual([1, 3])
    expect(candidate.items).toHaveLength(3)
  })
  test('rejects invalid identifiers, numbers and displacement bounds', () => {
    expect(() => new KnotCandidate({
      ...candidateData,
      id: '../fable',
    }, [])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [
      {
        ...item(1),
        id: '../other',
      },
    ])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [
      item(1), {
        ...item(2),
        id: 'item_1',
      },
    ])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [
      item(1), {
        ...item(1),
        id: 'another',
      },
    ])).toThrow('number')
    for (const number of [0, -1, 0.5, Number.NaN, Infinity]) {
      expect(() => new KnotCandidate(candidateData, [item(number)])).toThrow()
    }
    for (const displacement of [-1, Number.NaN, Infinity]) {
      expect(() => new KnotCandidate(candidateData, [
        {
          ...item(1),
          displacement,
        },
      ])).toThrow('displacement')
    }
  })
  test('rejects duplicate candidate IDs and globally duplicated plate numbers', () => {
    const a = new KnotCandidate(candidateData, [item(1)])
    const b = new KnotCandidate({
      ...candidateData,
      id: 'astra',
    }, [item(1)])
    expect(() => indexKnots([a, a])).toThrow('candidate')
    expect(() => indexKnots([a, b])).toThrow('number')
  })
  test('every forwarded entry has its own matching data and material files', async () => {
    for (const candidate of knotCandidates) {
      const barrel = await import(`../../src/lib/knots/${candidate.data.id}/index.ts`)
      expect(Object.keys(barrel)).toHaveLength(candidate.items.length + 1)
      for (const entry of candidate.items) {
        expect(barrel[entry.sourceId].number).toBe(entry.number)
        expect(barrel[entry.sourceId].id).toBe(entry.sourceId)
        expect(await Bun.file(`src/lib/knots/${entry.model}/items/${entry.sourceId}/material.ts`).exists()).toBe(true)
      }
    }
    const materialFiles = await Array.fromAsync(new Bun.Glob('src/lib/knots/*/items/*/material.ts').scan('.'))
    expect(new Set(materialFiles.map(path => path.replaceAll('\\', '/')))).toEqual(new Set(knots.map(item => `src/lib/knots/${item.model}/items/${item.sourceId}/material.ts`)))
    expect(knots.map(item => item.number)).toEqual(Array.from({length: 185}, (_, index) => index + 1))
  })
  test('groups Gemini versions together without losing per-item author fidelity', () => {
    const gemini = knotCandidates.filter(candidate => candidate.data.id === 'gemini')
    expect(gemini).toHaveLength(1)
    expect(gemini[0].items).toHaveLength(16)
    expect(catalogNumbers(gemini[0])).toEqual([25, 26, 27, 28, 29, 30, 31, 32, 81, 82, 83, 84, 85, 86, 87, 88])
    const original = gemini[0].items.find(item => item.number === 32)!
    const latest = gemini[0].items.find(item => item.number === 88)!
    expect(original.author.model).toEqual({title: 'Gemini 3.6 Flash'})
    expect(latest.author.model).toEqual({
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    })
    expect(original.modelTitle).toBe(original.author.model.title)
    expect(latest.modelTitle).toBe(latest.author.model.title)
    expect(original.modelIcon).toBe(latest.modelIcon)
    expect(() => new KnotCandidate(candidateData, [
      {
        ...item(1),
        author: {model: {title: ' '}},
      },
    ])).toThrow('author')
  })
  test('keeps the requested next-batch model credits and catalog entries', () => {
    const expected = [
      {
        candidate: 'deepseek',
        first: 106,
        model: {
          title: 'DeepSeek 4.1 Flash',
          slug: 'deepseek/deepseek-v4.1-flash',
          effortLevel: 'max',
        },
      },
      {
        candidate: 'muse',
        first: 114,
        model: {
          title: 'Muse Spark 1.3',
          slug: 'meta/muse-spark-1.3-contributor',
          effortLevel: 'xhigh',
        },
      },
      {
        candidate: 'glm',
        first: 130,
        model: {
          title: 'GLM 5.3 Flash',
          slug: 'z-ai/glm-5.3-flash',
          effortLevel: 'max',
        },
      },
      {
        candidate: 'hunyuan',
        first: 122,
        model: {
          title: 'HY4 Preview',
          slug: 'tencent/hy4-preview',
          effortLevel: 'high',
        },
      },
    ]
    for (const batch of expected) {
      const candidate = knotCandidates.find(candidate => candidate.data.id === batch.candidate)!
      const entries = candidate.items.filter(item => item.number >= batch.first && item.number < batch.first + 8)
      expect(entries).toHaveLength(8)
      for (const entry of entries) {
        expect(entry.author.model).toEqual(batch.model)
      }
    }
    expect(catalogNumbers(knotCandidates.find(candidate => candidate.data.id === 'deepseek')!)).toEqual([17, 18, 19, 20, 21, 22, 23, 24, 106, 107, 108, 109, 110, 111, 112, 113])
    expect(knots.find(item => item.number === 111)!.sourceId).toBe('quantum_foam_2')
    expect(knots.find(item => item.number === 114)!.displacement).toBe(0.02)
  })
  test('records OpenRouter, Codex and web-chat harness provenance without guessing legacy sources', () => {
    const astra = knots.filter(entry => entry.model === 'astra')
    const openRouter = knots.filter(entry => entry.model !== 'astra' && entry.author.model.slug)
    const webChat = knots.filter(entry => entry.model !== 'astra' && !entry.author.model.slug && entry.harness)
    const legacy = knots.filter(entry => entry.model !== 'astra' && !entry.author.model.slug && !entry.harness)
    expect(astra).toHaveLength(17)
    expect(openRouter).toHaveLength(56)
    expect(webChat).toHaveLength(48)
    expect(legacy).toHaveLength(64)
    expect(astra.every(entry => entry.harness === 'Codex')).toBe(true)
    expect(openRouter.every(entry => entry.harness === 'none')).toBe(true)
    expect(legacy.every(entry => entry.harness === undefined)).toBe(true)
    expect(Object.fromEntries(['chat.z.ai', 'grok.com Build', 'grok.com', 'kimi.ai', 'meta.ai', 'chat.qwen.ai'].map(harness => [harness, webChat.filter(entry => entry.harness === harness).length]))).toEqual({
      'chat.z.ai': 8,
      'grok.com Build': 8,
      'grok.com': 8,
      'kimi.ai': 8,
      'meta.ai': 8,
      'chat.qwen.ai': 8,
    })
  })
  test('filters candidates and caps shots from Knottingham URL parameters', () => {
    const bays = selectKnotBays('?candidates=glm,gemini&shots=2')
    expect(bays.map(bay => bay.candidate.data.id)).toEqual(['gemini', 'glm'])
    expect(bays.map(bay => bay.finishes.map(item => item.number))).toEqual([[25, 32], [34, 40]])
    expect(bays.flatMap(bay => bay.finishes).filter(item => item.highlighted).map(item => item.number)).toEqual([32, 40])
    expect(selectKnotBays('?candidates=astra&shots=3')[0].finishes.map(item => item.number)).toEqual([1, 6, 97])
    expect(() => selectKnotBays('?shots=0')).toThrow('shots')
    expect(() => selectKnotBays('?candidates=missing')).toThrow('candidate')
  })
  test('formats only truly consecutive selections as ranges', () => {
    expect(formatKnotLabels([])).toBe('')
    expect(formatKnotLabels([6])).toBe('#06')
    expect(formatKnotLabels([89, 90, 91])).toBe('#89–#91')
    expect(formatKnotLabels([6, 75, 97])).toBe('#06 · #75 · #97')
  })
  test('adds the new GLM batch without replacing its highlighted original', () => {
    const glm = knotCandidates.find(candidate => candidate.data.id === 'glm')!
    expect(glm.items).toHaveLength(32)
    expect(catalogNumbers(glm)).toEqual([33, 34, 35, 36, 37, 38, 39, 40, 98, 99, 100, 101, 102, 103, 104, 105, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145])
    for (const entry of glm.items.filter(item => item.number >= 98 && item.number <= 105)) {
      expect(entry.author.model).toEqual({
        title: 'GLM 5.3',
        slug: 'z-ai/glm-5.3',
        effortLevel: 'max',
      })
      expect(entry.highlighted).toBe(false)
      expect(entry.archived).not.toBe(true)
    }
    expect(glm.items.find(item => item.number === 40)!.highlighted).toBe(true)
  })
})
