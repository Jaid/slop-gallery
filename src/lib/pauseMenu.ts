import PauseMenu from 'use-pause-menu/core'

import {galleryStorageKey} from './level.ts'
import {localStore} from './temporary.ts'

export function readControlled() {
  try {
    return localStore().getItem('slop-gallery-controlled') === 'true'
  } catch {
    return false
  }
}

const pauseMenu = new PauseMenu({
  storage: localStore,
  storageKey: `${galleryStorageKey}-visited`,
})

export default pauseMenu
