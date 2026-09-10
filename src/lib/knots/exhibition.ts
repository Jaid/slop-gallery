import type {Vec3} from '../gallery/types.ts'

import {knotCandidates} from './index.ts'

export const knotFloatHeight = 1
export const knotSpacing = 3.5
const label = (number: number) => '#' + String(number).padStart(2, '0')

export function formatKnotLabels(numbers: ReadonlyArray<number>) {
  if (numbers.length > 1 && numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1)) return label(numbers[0]) + '–' + label(numbers.at(-1)!)
  return numbers.map(label).join(' · ')
}

export const knotBays = knotCandidates.map(candidate => ({candidate, finishes: candidate.select()})).filter(bay => bay.finishes.length > 0).map(({candidate, finishes}, index) => ({
  model: candidate.data.id,
  title: candidate.data.title,
  icon: candidate.data.icon,
  overview: candidate.data.overview,
  finishes,
  firstNumber: finishes[0].number,
  lastNumber: finishes.at(-1)!.number,
  labels: formatKnotLabels(finishes.map(item => item.number)),
  center: [0, 0, 2 - index * 5.5] as Vec3,
}))

export const knotRowHalfWidth = Math.max(0, ...knotBays.map(bay => (bay.finishes.length - 1) * knotSpacing / 2))

export const knotExhibition = knotBays.flatMap(bay => bay.finishes.map((finish, index) => ({
  ...finish,
  label: label(finish.number),
  position: [index * knotSpacing - knotRowHalfWidth, 0, bay.center[2]] as Vec3,
  rotation: 0,
})))
export type KnotExhibit = typeof knotExhibition[number]
export type KnotBay = typeof knotBays[number]

export const knotPreviewX = -knotRowHalfWidth - 6.25
