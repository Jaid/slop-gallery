import PauseMenu from 'use-pause-menu/core'

import {galleryStorageKey} from './level.ts'

export function readControlled() {
  try {
    return localStorage.getItem('slop-gallery-controlled') === 'true'
  } catch {
    return false
  }
}

const pauseMenu = new PauseMenu({
  storageKey: `${galleryStorageKey}-visited`,
})

export default pauseMenu
