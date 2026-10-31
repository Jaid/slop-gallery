// Must run before any renderer updates its node time.
import './lib/frozenTime.ts'
import './style.sass'

import mountRoot from 'mount-root'

import App from '#component/App'

import {applySpawnBookmark} from './lib/gallery/bookmarks.ts'
import pauseMenu from './lib/pauseMenu.ts'

import css from './style.module.sass'

pauseMenu.start()
applySpawnBookmark()
mountRoot(App, {
  id: css.container,
  strict: import.meta.env.DEV,
})
