import type {Vec3} from '../gallery/types.ts'

import {knotCandidates} from './index.ts'
import {KnotLayout} from './KnotLayout.ts'

export const knotFloatHeight = 1
const selectedBays = knotCandidates.map(candidate => ({
  candidate,
  finishes: candidate.select(),
})).filter(bay => bay.finishes.length > 0)
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
