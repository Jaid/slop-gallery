import type {RarityChange} from '../src/KnotRarityEditor.ts'

import {describe, expect, test} from 'bun:test'

import parseCandidateOrder from '../src/candidateOrder.ts'
import {candidateScore, knotPreviewX, knotRowHalfWidth, knotSpacing, selectKnotBays} from '../src/exhibition.ts'
import KnotRarityEditor from '../src/KnotRarityEditor.ts'
import {knotCandidates, knots} from '../src/main.ts'
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
  test('score is average knot rarity and sorts candidates descending', () => {
    for (const candidate of knotCandidates) {
      expect(candidateScore(candidate)).toBe(candidate.items.reduce((sum, item) => sum + item.rarity, 0) / candidate.items.length)
    }
    const bays = selectKnotBays()
    const scores = bays.map(bay => candidateScore(bay.candidate))
    expect(scores).toEqual(scores.toSorted((a, b) => b - a))
  })
  test('name sorts by candidate title', () => {
    const bays = selectKnotBays('?candidate_order=name')
    const titles = bays.map(bay => bay.candidate.data.title)
    expect(titles).toEqual(titles.toSorted((a, b) => a.localeCompare(b)))
  })
})
describe('session rarity editor', () => {
  test('cycles 1–4 and publishes immutable snapshots without mutating source rarity or layout', () => {
    const changes: Array<RarityChange> = []
    const editor = new KnotRarityEditor(knots, change => changes.push(change))
    const item = knots.find(entry => entry.rarity === 1)!
    const original = editor.getSnapshot()
    let notifications = 0
    const unsubscribe = editor.subscribe(() => notifications++)
    for (const expected of [2, 3, 4, 1] as const) {
      expect(editor.cycle(item.id).value).toBe(expected)
      expect(editor.getSnapshot().get(item.id)).toBe(expected)
      expect(item.rarity).toBe(1)
    }
    expect(original.get(item.id)).toBe(1)
    expect(editor.getSnapshot()).not.toBe(original)
    expect(changes.map(change => change.sequence)).toEqual([1, 2, 3, 4])
    expect(changes.map(change => change.previous)).toEqual([1, 2, 3, 4])
    expect(changes.every(change => change.baseline === 1 && change.candidateId === item.candidateId)).toBe(true)
    expect(notifications).toBe(4)
    unsubscribe()
    editor.cycle(item.id)
    expect(notifications).toBe(4)
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
