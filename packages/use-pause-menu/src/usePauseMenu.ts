import type PauseMenu from './PauseMenu.ts'

import {useEffect, useSyncExternalStore} from 'react'

/** Subscribe anywhere in the UI; create and share the controller outside render. */
export default function usePauseMenu(menu: PauseMenu) {
  const snapshot = useSyncExternalStore(menu.subscribe, menu.getSnapshot, menu.getServerSnapshot)
  useEffect(() => {
    menu.start()
  }, [menu])
  return snapshot
}
