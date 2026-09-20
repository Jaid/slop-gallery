import type {KnotEntry, Vec3} from './types.ts'

import parseCandidateOrder from './candidateOrder.ts'
import KnotLayout from './KnotLayout.ts'
import {knotCandidates} from './main.ts'
import parseRarityMode from './rarityMode.ts'

export const knotFloatHeight = 1

export function candidateScore(candidate: (typeof knotCandidates)[number]) {
  return candidate.items.reduce((sum, item) => sum + item.rarity, 0) / candidate.items.length
}

export function selectKnotBays(search = '') {
  const params = new URLSearchParams(search)
  function positiveIntegerParam(name: string, fallback: number) {
    const raw = params.get(name)
    if (raw === null) {
      return fallback
    }
    const value = Number(raw)
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(`Knot ${name} URL parameter must be a positive integer.`)
    }
    return value
  }
  const rarityMode = parseRarityMode(search)
  const candidateOrder = parseCandidateOrder(search)
  const requested = [...new Set(params.getAll('candidates').flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean))]
  const known = new Set(knotCandidates.map(candidate => candidate.data.id))
  const unknown = requested.filter(id => !known.has(id))
  if (unknown.length) {
    throw new Error(`Unknown Knot candidate URL selection: ${unknown.join(', ')}`)
  }
  const shots = positiveIntegerParam('shots', 4)
  const candidateLimit = positiveIntegerParam('candidate_limit', 8)
  const selected = requested.length ? knotCandidates.filter(candidate => requested.includes(candidate.data.id)) : knotCandidates
  const byName = (a: (typeof knotCandidates)[number], b: (typeof knotCandidates)[number]) => a.data.title.localeCompare(b.data.title) || a.data.id.localeCompare(b.data.id)
  const byScore = (a: (typeof knotCandidates)[number], b: (typeof knotCandidates)[number]) => candidateScore(b) - candidateScore(a) || byName(a, b)
  const ordered = selected.toSorted(candidateOrder === 'score' ? byScore : byName).slice(0, candidateLimit)
  return ordered.map(candidate => ({
    candidate,
    finishes: candidate.select(shots, rarityMode !== 'false'),
  })).filter(bay => bay.finishes.length > 0)
}

export function enumerateKnotBays(bays: ReturnType<typeof selectKnotBays>) {
  let number = 0
  return bays.map(({candidate, finishes}) => ({
    candidate,
    finishes: finishes.map(finish => ({
      ...finish,
      number: ++number,
    })),
  }))
}

const search = typeof location === 'undefined' ? '' : location.search
export const knotRarityMode = parseRarityMode(search)
const selectedBays = enumerateKnotBays(selectKnotBays(search))
export const knotLayout = new KnotLayout(selectedBays.map(bay => bay.finishes.length))
export const knotSpacing = knotLayout.itemSpacing
export const knotNumberLabel = (number: number) => `#${String(number).padStart(2, '0')}`

export function formatKnotLabels(numbers: ReadonlyArray<number>) {
  if (numbers.length > 1 && numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1)) {
    return `${knotNumberLabel(numbers[0])}–${knotNumberLabel(numbers.at(-1)!)}`
  }
  return numbers.map(knotNumberLabel).join(' · ')
}

export const knotBays = selectedBays.map(({candidate, finishes}, index) => ({
  candidate: candidate.data,
  finishes,
  labels: formatKnotLabels(finishes.map(item => item.number)),
  center: [0, 0, knotLayout.rowZ(index)] as Vec3,
}))

export const knotRowHalfWidth = knotLayout.rowHalfWidth

export const knotExhibition = knotBays.flatMap(bay => bay.finishes.map((finish, index) => ({
  ...finish,
  label: knotNumberLabel(finish.number),
  position: [index * knotSpacing - knotRowHalfWidth, 0, bay.center[2]] as Vec3,
  rotation: 0,
})))
export type KnotExhibit = typeof knotExhibition[number]
export type KnotBay = typeof knotBays[number]
export type NumberedKnot = KnotEntry & {number: number}

export const knotPreviewX = knotLayout.previewX
