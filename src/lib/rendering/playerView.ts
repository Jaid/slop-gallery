import aimDot from '#src/lib/aimDot.ts'

let zoom = 0
let knotFocus = 0
let knotFocusDistance = 1
let knotFocusProximity = 0

export function getPlayerZoom() {
  return zoom
}

export function setPlayerZoom(amount: number) {
  zoom = Math.max(0, Math.min(1, amount))
  aimDot.setBlocked('zoom', zoom > 0)
}

export function getKnotFocus() {
  return knotFocus
}

export function getKnotFocusDistance() {
  return knotFocusDistance
}

export function getKnotFocusProximity() {
  return knotFocusProximity
}

export function setKnotFocus(amount: number, distance: number, proximity: number) {
  knotFocus = Math.max(0, Math.min(1, amount))
  knotFocusProximity = Math.max(0, Math.min(1, proximity))
  if (Number.isFinite(distance) && distance > 0) {
    knotFocusDistance = distance
  }
}
