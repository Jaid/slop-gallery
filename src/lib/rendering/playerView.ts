let zoom = 0

export function getPlayerZoom() {
  return zoom
}

export function setPlayerZoom(amount: number) {
  zoom = Math.max(0, Math.min(1, amount))
}
