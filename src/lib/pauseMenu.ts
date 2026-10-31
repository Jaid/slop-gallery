import PauseMenu from 'use-pause-menu/core'

import {isContinuing} from './gameSeed.ts'

// A stored seed is the only trace of an earlier visit, so its game can be continued or replaced by a new one.
const pauseMenu = new PauseMenu({initialStage: isContinuing ? 'return' : 'first'})

export default pauseMenu
