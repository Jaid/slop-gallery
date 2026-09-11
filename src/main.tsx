import './style.sass'

import mountRoot from 'mount-root'
import {NuqsAdapter} from 'nuqs/adapters/react'

import App from '#component/App'

import {initializePersistence} from './lib/gallery/GalleryRepository.ts'
import pauseMenu from './lib/pauseMenu.ts'

import css from './style.module.sass'

pauseMenu.start()
const stopPersistence = await initializePersistence()
if (import.meta.hot) {
  import.meta.hot.dispose(stopPersistence)
}
mountRoot(App, {
  id: css.container,
  wrapper: NuqsAdapter,
  strict: import.meta.env.DEV,
})
