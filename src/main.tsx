import './style.sass'

import mountRoot from 'mount-root'

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
  strict: import.meta.env.DEV,
})
