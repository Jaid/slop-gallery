import type Narrator from './Narrator.ts'

import {useSyncExternalStore} from 'react'

/** Does not stop a shared narrator when an individual subscriber unmounts. */
export default function useNarrator(narrator: Narrator) {
  return useSyncExternalStore(narrator.subscribe, narrator.getSnapshot, narrator.getSnapshot)
}
