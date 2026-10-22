import type {LocationBookmark} from '#src/lib/gallery/types.ts'

import {playerSpawn} from './navigation.ts'

/** named player poses for `?spawn` and, with `teleport`, for T in `?development`, see `src/lib/gallery/bookmarks.ts` */
export const locationBookmarks: Array<LocationBookmark> = [
  {
    ...playerSpawn,
    id: 'lobby_spawn',
    teleport: true,
  },
  {
    id: 'sienna_center',
    position: [-14, 0.04, 17.6],
    yaw: 0,
    pitch: 0,
    teleport: true,
  },
  {
    id: 'moonfall_crater',
    position: [-8, -7.96, 30.1],
    yaw: 0,
    pitch: 0,
    teleport: true,
  },
]
