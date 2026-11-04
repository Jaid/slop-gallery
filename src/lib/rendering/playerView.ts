import {clamp} from 'math'

import aimDot from '#src/lib/aimDot.ts'
import interactionHint from '#src/lib/interactionHint.ts'

let zoom = 0
let introBlur = 0
let focus = 0
let focusBlur = 1
let focusDistance = 1
let focusProximity = 0

export function getPlayerZoom() {
  return zoom
}

export function setPlayerZoom(amount: number) {
  zoom = clamp(amount, 0, 1)
  aimDot.setBlocked('zoom', zoom > 0)
  // Only the overlay is hidden; the aimed target and its controls keep working while zoomed.
  interactionHint.setSuppressed(zoom > 0)
}

/** Sets how strongly the intro blurs the upper and lower thirds of the screen, 1 as much as a full zoom. */
export function setIntroBlur(amount: number) {
  introBlur = clamp(amount, 0, 1)
}

/** how strongly the upper and lower thirds of the screen blur: as much as the zoom or the intro asks for, whichever asks for more */
export function getTiltShift() {
  return Math.max(zoom, introBlur)
}

export function getInspectionFocus() {
  return focus
}

/** how strongly the background blurs while inspecting, relative to the default */
export function getInspectionFocusBlur() {
  return focusBlur
}

export function getInspectionFocusDistance() {
  return focusDistance
}

export function getInspectionFocusProximity() {
  return focusProximity
}

/** Without a blur factor, the last one stays, so a fade-out keeps the strength it faded in with. */
export function setInspectionFocus(amount: number, distance: number, proximity: number, blur?: number) {
  focus = clamp(amount, 0, 1)
  if (blur !== undefined && Number.isFinite(blur) && blur >= 0) {
    focusBlur = blur
  }
  focusProximity = clamp(proximity, 0, 1)
  if (Number.isFinite(distance) && distance > 0) {
    focusDistance = distance
  }
}
