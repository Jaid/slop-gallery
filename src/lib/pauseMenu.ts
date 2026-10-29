import PauseMenu from 'use-pause-menu/core'

import {currentWorldInfo} from '#src/worlds/index.ts'

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
  storageKey: `${currentWorldInfo.storageKey}-visited`,
})

export default pauseMenu
