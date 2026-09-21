import type {RarityChange} from '../src/KnotRarityEditor.ts'

import {describe, expect, test} from 'bun:test'

import parseCandidateOrder from '../src/candidateOrder.ts'
import {candidateScore, knotPreviewX, knotRowHalfWidth, knotSpacing, selectKnotBays} from '../src/exhibition.ts'
import KnotRarityEditor from '../src/KnotRarityEditor.ts'
import {knotCandidates, knots} from '../src/main.ts'
import parseRarityFilter from '../src/rarityFilter.ts'
import parseRarityMode from '../src/rarityMode.ts'

describe('rarity selection policy', () => {
  test('parses exactly true, false and edit, defaulting to true', () => {
    expect(parseRarityMode()).toBe('true')
    for (const mode of ['true', 'false', 'edit'] as const) {
      expect(parseRarityMode(`?rarity=${mode}`)).toBe(mode)
    }
    for (const value of ['', '1', 'yes', 'EDIT']) {
      expect(() => parseRarityMode(`?rarity=${value}`)).toThrow('rarity')
    }
  })
  test('parses rarity filters as numeric tiers or enum names', () => {
    expect(parseRarityFilter()).toBeUndefined()
    expect([...parseRarityFilter('?rarity_filter=0')!]).toEqual([0])
    expect([...parseRarityFilter('?rarity_filter=unknown,rare,4')!]).toEqual([0, 2, 4])
    expect([...parseRarityFilter('?rarity_filter=common&rarity_filter=3,ethereal')!]).toEqual([1, 3, 4])
    expect([...parseRarityFilter('?rarity_filter=0,unknown,0')!]).toEqual([0])
    for (const value of ['', '5', '-1', '1.5', 'UNKNOWN', 'legendary', '0,,1']) {
      expect(() => parseRarityFilter(`?rarity_filter=${value}`)).toThrow('rarity_filter')
    }
  })
  test('filters before shot and candidate limits and composes with edit and knot_id', () => {
    const unknownBays = selectKnotBays('?rarity=edit&rarity_filter=0')
    expect(unknownBays).toHaveLength(Math.min(8, knotCandidates.filter(candidate => candidate.items.some(item => !item.archived && item.rarity === 0)).length))
    expect(unknownBays.every(bay => bay.finishes.length > 0 && bay.finishes.length <= 4)).toBe(true)
    expect(unknownBays.flatMap(bay => bay.finishes).every(item => item.rarity === 0)).toBe(true)
    const mixed = selectKnotBays('?rarity_filter=unknown,rare&candidate_limit=3&shots=2')
    expect(mixed).toHaveLength(3)
    expect(mixed.every(bay => bay.finishes.length <= 2 && bay.finishes.every(item => item.rarity === 0 || item.rarity === 2))).toBe(true)
    const unknownItem = knots.find(item => item.rarity === 0 && !item.archived)!
    const ratedItem = knots.find(item => item.rarity === 4 && !item.archived)!
    const exact = selectKnotBays(`?knot_id=${unknownItem.id},${ratedItem.id}&rarity_filter=unknown`)
    expect(exact.flatMap(bay => bay.finishes).map(item => item.id)).toEqual([unknownItem.id])
  })
  test('omits lower rarities first for every shot cap and places rarer knots away from the billboard', () => {
    for (const candidate of knotCandidates) {
      const available = candidate.items.filter(item => !item.archived)
      for (let limit = 1; limit <= available.length; limit++) {
        const selected = candidate.select(limit)
        const ids = new Set(selected.map(item => item.id))
        const omitted = available.filter(item => !ids.has(item.id))
        expect(selected).toHaveLength(limit)
        if (omitted.length) {
          expect(Math.min(...selected.map(item => item.rarity))).toBeGreaterThanOrEqual(Math.max(...omitted.map(item => item.rarity)))
        }
        let prior = 0
        for (const [index, item] of selected.entries()) {
          expect(item.rarity).toBeGreaterThanOrEqual(prior)
          expect(index * knotSpacing - knotRowHalfWidth).toBeGreaterThan(knotPreviewX)
          prior = item.rarity
        }
      }
    }
  })
  test('false bypasses rarity for both omissions and ordering; edit starts from the true selection', () => {
    for (const candidate of knotCandidates) {
      const search = `?candidates=${candidate.data.id}&shots=3`
      const selected = selectKnotBays(`${search}&rarity=false`)[0]?.finishes ?? []
      const expected = candidate.items.filter(item => !item.archived).toSorted((a, b) => a.id.localeCompare(b.id)).slice(0, 3)
      expect(selected.map(item => item.id)).toEqual(expected.map(item => item.id))
      expect(selectKnotBays(`${search}&rarity=edit`)).toEqual(selectKnotBays(`${search}&rarity=true`))
    }
  })
})
describe('candidate ordering', () => {
  test('parses score and name, defaulting to score', () => {
    expect(parseCandidateOrder()).toBe('score')
    expect(parseCandidateOrder('?candidate_order=score')).toBe('score')
    expect(parseCandidateOrder('?candidate_order=name')).toBe('name')
    for (const value of ['', 'rarity', 'SCORE']) {
      expect(() => parseCandidateOrder(`?candidate_order=${value}`)).toThrow('candidate_order')
    }
  })
  test('score is average knot rarity and the default selects the best eight candidates', () => {
    for (const candidate of knotCandidates) {
      expect(candidateScore(candidate)).toBe(candidate.items.reduce((sum, item) => sum + item.rarity, 0) / candidate.items.length)
    }
    const bays = selectKnotBays()
    const scores = bays.map(bay => candidateScore(bay.candidate))
    expect(bays).toHaveLength(8)
    expect(bays.every(bay => bay.finishes.length === 4)).toBe(true)
    expect(scores).toEqual(scores.toSorted((a, b) => b - a))
  })
  test('candidate_limit truncates after candidate ordering', () => {
    const byScore = selectKnotBays('?candidate_limit=3')
    expect(byScore).toHaveLength(3)
    const expectedByScore = knotCandidates.toSorted((a, b) => candidateScore(b) - candidateScore(a)
      || a.data.title.localeCompare(b.data.title)
      || a.data.id.localeCompare(b.data.id))
      .slice(0, 3)
    expect(byScore.map(bay => bay.candidate.data.id)).toEqual(expectedByScore.map(candidate => candidate.data.id))
    const byName = selectKnotBays('?candidate_order=name&candidate_limit=3')
    const expectedByName = knotCandidates.toSorted((a, b) => a.data.title.localeCompare(b.data.title) || a.data.id.localeCompare(b.data.id))
      .slice(0, 3)
    expect(byName.map(bay => bay.candidate.data.id)).toEqual(expectedByName.map(candidate => candidate.data.id))
    for (const value of ['0', '-1', '1.5', '']) {
      expect(() => selectKnotBays(`?candidate_limit=${value}`)).toThrow('candidate_limit')
    }
  })
  test('name sorts by candidate title', () => {
    const bays = selectKnotBays('?candidate_order=name')
    const titles = bays.map(bay => bay.candidate.data.title)
    expect(titles).toEqual(titles.toSorted((a, b) => a.localeCompare(b)))
  })
})
describe('session rarity editor', () => {
  test.each([0, 1, 2, 3, 4] as const)('cycles all five rarities from %i without mutating source rarity or layout', initial => {
    const changes: Array<RarityChange> = []
    const editor = new KnotRarityEditor(knots, change => changes.push(change))
    const item = knots.find(entry => entry.rarity === initial)!
    const original = editor.getSnapshot()
    const layout = selectKnotBays('?rarity=edit')
    let notifications = 0
    const unsubscribe = editor.subscribe(() => notifications++)
    const cycle = [0, 1, 2, 3, 4] as const
    const expected = [...cycle.slice(initial + 1), ...cycle.slice(0, initial + 1)]
    for (const value of expected) {
      expect(editor.cycle(item.id).value).toBe(value)
      expect(editor.getSnapshot().get(item.id)).toBe(value)
      expect(item.rarity).toBe(initial)
    }
    expect(original.get(item.id)).toBe(initial)
    expect(editor.getSnapshot()).not.toBe(original)
    expect(changes.map(change => change.sequence)).toEqual([1, 2, 3, 4, 5])
    expect(changes.map(change => change.previous)).toEqual([initial, ...expected.slice(0, -1)])
    expect(changes.every(change => change.baseline === initial && change.candidateId === item.candidateId)).toBe(true)
    expect(notifications).toBe(5)
    expect(selectKnotBays('?rarity=edit')).toEqual(layout)
    unsubscribe()
    editor.cycle(item.id)
    expect(notifications).toBe(5)
    expect(() => editor.cycle('not_a_knot')).toThrow('Unknown Knot ID')
  })
  test('does not show an accepted edit when recording fails', () => {
    const editor = new KnotRarityEditor(knots, () => {
      throw new Error('Recorder unavailable')
    })
    const initial = editor.getSnapshot()
    expect(() => editor.cycle(knots[0].id)).toThrow('Recorder unavailable')
    expect(editor.getSnapshot()).toBe(initial)
  })
})
