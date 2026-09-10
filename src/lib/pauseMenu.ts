import {PauseMenu} from 'use-pause-menu/core'

export function readControlled() {
  try {
    return localStorage.getItem('slop-gallery-controlled') === 'true'
  } catch {
    return false
  }
}

// Only the gallery knows about its pre-package visit marker.
export const pauseMenu = new PauseMenu({
  initialStage: readControlled() ? 'return' : 'first',
  storageKey: 'slop-gallery-visited',
})
