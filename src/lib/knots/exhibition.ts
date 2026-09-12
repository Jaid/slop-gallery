import type {Vec3} from '../gallery/types.ts'

import {knotCandidates} from './index.ts'
import KnotLayout from './KnotLayout.ts'

export const knotFloatHeight = 1

export function selectKnotBays(search = '') {
  const params = new URLSearchParams(search)
  const requested = [...new Set(params.getAll('candidates').flatMap(value => value.split(',')).map(value => value.trim()).filter(Boolean))]
  const known = new Set(knotCandidates.map(candidate => candidate.data.id))
  const unknown = requested.filter(id => !known.has(id))
  if (unknown.length) {
    throw new Error(`Unknown Knot candidate URL selection: ${unknown.join(', ')}`)
  }
  const rawShots = params.get('shots')
  let shots: number | undefined
  if (rawShots !== null) {
    shots = Number(rawShots)
    if (!Number.isSafeInteger(shots) || shots < 1) {
      throw new Error('Knot shots URL parameter must be a positive integer.')
    }
  }
  const selected = requested.length ? knotCandidates.filter(candidate => requested.includes(candidate.data.id)) : knotCandidates
  return selected.map(candidate => ({
    candidate,
    finishes: candidate.select(shots),
  })).filter(bay => bay.finishes.length > 0)
}

const selectedBays = selectKnotBays(typeof location === 'undefined' ? '' : location.search)
export const knotLayout = new KnotLayout(selectedBays.map(bay => bay.finishes.length))
export const knotSpacing = knotLayout.itemSpacing
const label = (number: number) => `#${String(number).padStart(2, '0')}`

export function formatKnotLabels(numbers: ReadonlyArray<number>) {
  if (numbers.length > 1 && numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1)) {
    return `${label(numbers[0])}–${label(numbers.at(-1)!)}`
  }
  return numbers.map(label).join(' · ')
}

export const knotBays = selectedBays.map(({candidate, finishes}, index) => ({
  model: candidate.data.id,
  title: candidate.data.title,
  icon: candidate.data.icon,
  overview: candidate.data.overview,
  finishes,
  firstNumber: finishes[0].number,
  lastNumber: finishes.at(-1)!.number,
  labels: formatKnotLabels(finishes.map(item => item.number)),
  center: [0, 0, knotLayout.rowZ(index)] as Vec3,
}))

export const knotRowHalfWidth = knotLayout.rowHalfWidth

export const knotExhibition = knotBays.flatMap(bay => bay.finishes.map((finish, index) => ({
  ...finish,
  label: label(finish.number),
  position: [index * knotSpacing - knotRowHalfWidth, 0, bay.center[2]] as Vec3,
  rotation: 0,
})))
export type KnotExhibit = typeof knotExhibition[number]
export type KnotBay = typeof knotBays[number]

export const knotPreviewX = knotLayout.previewX
