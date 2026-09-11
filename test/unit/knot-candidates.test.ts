import type {KnotCandidateData, KnotData} from '../../src/lib/knots/types.ts'

import {describe, expect, test} from 'bun:test'

import {knotCandidates, knots} from '../../src/lib/knots/index.ts'
import {defaultKnotDisplayLimit, indexKnots, KnotCandidate} from '../../src/lib/knots/KnotCandidate.ts'
import {formatKnotLabels} from '../../src/lib/knots/exhibition.ts'

const candidateData: KnotCandidateData = {id: 'fable', title: 'Claude Fable 5.1', icon: 'icon.jxl', overview: 'overview.jxl'}
const item = (number: number, highlighted = false): KnotData => ({id: 'item_' + number, number, title: 'Knot ' + number, accent: '#fff', icon: 'icon.jxl', author: {model: {title: 'Claude Fable 5.1'}}, highlighted})
const numbers = (candidate: KnotCandidate, limit?: number) => candidate.select(limit).map(item => item.number)

describe('arbitrary Knot batches', () => {
  test('keeps favorites when a second batch grows a candidate to 16 entries', () => {
    const items = Array.from({length: 16}, (_, index) => item(index + 1, [1, 3, 6, 8].includes(index + 1)))
    const candidate = new KnotCandidate(candidateData, items)
    expect(defaultKnotDisplayLimit).toBe(8)
    expect(candidate.items).toHaveLength(16)
    expect(numbers(candidate)).toEqual([1, 3, 6, 8, 13, 14, 15, 16])
    expect(numbers(candidate, 16)).toEqual(Array.from({length: 16}, (_, index) => index + 1))
    expect(numbers(new KnotCandidate({...candidateData, displayLimit: 16}, items))).toHaveLength(16)
    expect(items.map(item => item.number)).toEqual(Array.from({length: 16}, (_, index) => index + 1))
  })
  test('is independent of export order, including when highlights exceed capacity', () => {
    const items = Array.from({length: 11}, (_, index) => item(index + 1, true))
    expect(numbers(new KnotCandidate(candidateData, items))).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
    expect(numbers(new KnotCandidate(candidateData, items.toReversed()))).toEqual([4, 5, 6, 7, 8, 9, 10, 11])
  })
  test('handles empty, partial and hidden rows without padding or reintroducing archives', () => {
    expect(numbers(new KnotCandidate(candidateData, []))).toEqual([])
    const candidate = new KnotCandidate(candidateData, [item(1), {...item(2, true), archived: true}, item(3)])
    expect(numbers(candidate)).toEqual([1, 3])
    expect(numbers(candidate, 0)).toEqual([])
    expect(candidate.items).toHaveLength(3)
  })
  test('rejects invalid caps, identifiers, numbers and displacement bounds', () => {
    const candidate = new KnotCandidate(candidateData, [])
    for (const limit of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => candidate.select(limit)).toThrow(RangeError)
      expect(() => new KnotCandidate({...candidateData, displayLimit: limit}, [])).toThrow(RangeError)
    }
    expect(() => new KnotCandidate({...candidateData, id: '../fable'}, [])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [{...item(1), id: '../other'}])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [item(1), {...item(2), id: 'item_1'}])).toThrow('ID')
    expect(() => new KnotCandidate(candidateData, [item(1), {...item(1), id: 'another'}])).toThrow('number')
    for (const number of [0, -1, 0.5, NaN, Infinity]) expect(() => new KnotCandidate(candidateData, [item(number)])).toThrow()
    for (const displacement of [-1, NaN, Infinity]) expect(() => new KnotCandidate(candidateData, [{...item(1), displacement}])).toThrow('displacement')
  })
  test('rejects duplicate candidate IDs and globally duplicated plate numbers', () => {
    const a = new KnotCandidate(candidateData, [item(1)])
    const b = new KnotCandidate({...candidateData, id: 'astra'}, [item(1)])
    expect(() => indexKnots([a, a])).toThrow('candidate')
    expect(() => indexKnots([a, b])).toThrow('number')
  })
  test('every forwarded entry has its own matching data and material files', async () => {
    for (const candidate of knotCandidates) {
      const barrel = await import('../../src/lib/knots/' + candidate.data.id + '/index.ts')
      expect(Object.keys(barrel)).toHaveLength(candidate.items.length + 1)
      for (const entry of candidate.items) {
        expect(barrel[entry.sourceId].number).toBe(entry.number)
        expect(barrel[entry.sourceId].id).toBe(entry.sourceId)
        expect(await Bun.file('src/lib/knots/' + entry.model + '/items/' + entry.sourceId + '/material.ts').exists()).toBe(true)
      }
    }
    expect(knots.map(item => item.number)).toEqual(Array.from({length: 137}, (_, index) => index + 1))
  })
  test('groups Gemini versions together without losing per-item author fidelity', () => {
    const gemini = knotCandidates.filter(candidate => candidate.data.id === 'gemini')
    expect(gemini).toHaveLength(1)
    expect(gemini[0].items).toHaveLength(16)
    expect(numbers(gemini[0])).toEqual([32, 82, 83, 84, 85, 86, 87, 88])
    const original = gemini[0].items.find(item => item.number === 32)!
    const latest = gemini[0].items.find(item => item.number === 88)!
    expect(original.author.model).toEqual({title: 'Gemini 3.6 Flash'})
    expect(latest.author.model).toEqual({title: 'Gemini 3.8 Flash', slug: 'google/gemini-3.8-flash', effortLevel: 'high'})
    expect(original.modelTitle).toBe(original.author.model.title)
    expect(latest.modelTitle).toBe(latest.author.model.title)
    expect(original.modelIcon).toBe(latest.modelIcon)
    expect(() => new KnotCandidate(candidateData, [{...item(1), author: {model: {title: ' '}}}])).toThrow('author')
  })
  test('keeps the requested next-batch model credits and all previous review selections', () => {
    const expected = [
      {candidate: 'deepseek', first: 106, model: {title: 'DeepSeek 4.1 Flash', slug: 'deepseek/deepseek-v4.1-flash', effortLevel: 'max'}},
      {candidate: 'muse', first: 114, model: {title: 'Muse Spark 1.3', slug: 'meta/muse-spark-1.3-contributor', effortLevel: 'xhigh'}},
      {candidate: 'glm', first: 130, model: {title: 'GLM 5.3 Flash', slug: 'z-ai/glm-5.3-flash', effortLevel: 'max'}},
      {candidate: 'hunyuan', first: 122, model: {title: 'HY4 Preview', slug: 'tencent/hy4-preview', effortLevel: 'high'}},
    ]
    for (const batch of expected) {
      const candidate = knotCandidates.find(candidate => candidate.data.id === batch.candidate)!
      const entries = candidate.items.filter(item => item.number >= batch.first && item.number < batch.first + 8)
      expect(entries).toHaveLength(8)
      for (const entry of entries) {
        expect(entry.author.model).toEqual(batch.model)
        expect(candidate.select()).toContain(entry)
      }
    }
    expect(numbers(knotCandidates.find(candidate => candidate.data.id === 'deepseek')!)).toEqual([17, 19, 24, 106, 107, 108, 109, 110, 111, 112, 113])
    expect(knots.find(item => item.number === 111)!.sourceId).toBe('quantum_foam_2')
    expect(knots.find(item => item.number === 114)!.displacement).toBe(0.02)
  })
  test('formats only truly consecutive selections as ranges', () => {
    expect(formatKnotLabels([])).toBe('')
    expect(formatKnotLabels([6])).toBe('#06')
    expect(formatKnotLabels([89, 90, 91])).toBe('#89–#91')
    expect(formatKnotLabels([6, 75, 97])).toBe('#06 · #75 · #97')
  })
  test('adds the new GLM batch without replacing its highlighted original', () => {
    const glm = knotCandidates.find(candidate => candidate.data.id === 'glm')!
    expect(glm.items).toHaveLength(24)
    expect(numbers(glm)).toEqual([40, 98, 99, 100, 101, 102, 103, 104, 105, 130, 131, 132, 133, 134, 135, 136, 137])
    for (const entry of glm.items.filter(item => item.number >= 98 && item.number <= 105)) {
      expect(entry.author.model).toEqual({title: 'GLM 5.3', slug: 'z-ai/glm-5.3', effortLevel: 'max'})
      expect(entry.highlighted).toBe(false)
      expect(entry.archived).not.toBe(true)
    }
    expect(glm.items.find(item => item.number === 40)!.highlighted).toBe(true)
  })
})
