import type {LocationBookmark} from '#src/lib/gallery/types.ts'

import {playerSpawn} from './navigation.ts'

/** named player poses for `?spawn` and, with `teleport`, for T in `?development`, see `src/lib/gallery/bookmarks.ts` */
export const locationBookmarks: Array<LocationBookmark> = [
  {
    ...playerSpawn,
    id: 'spawn',
    teleport: true,
  },
  {
    id: 'fountain',
    position: [-5.8, 0.04, -5.8],
    yaw: -0.74,
    pitch: 0.03,
    teleport: true,
  },
  {
    id: 'dine',
    position: [16.1, 0.04, 7.4],
    yaw: 0.27,
    pitch: -0.08,
    teleport: true,
  },
  {
    id: 'salon',
    position: [8.6, 0.04, -18.3],
    yaw: -0.99,
    pitch: -0.03,
    teleport: true,
  },
  {
    id: 'vesper',
    position: [-18.6, 0.04, 7.4],
    yaw: -0.56,
    pitch: 0.07,
    teleport: true,
  },
  {
    id: 'sienna',
    position: [-19.4, 0.04, 8.6],
    yaw: -2.4,
    pitch: 0.02,
    teleport: true,
  },
  {
    id: 'lodge',
    position: [-28.7, -4.96, -38.2],
    yaw: -2.64,
    pitch: -0.03,
    teleport: true,
  },
  {
    id: 'oculus',
    position: [8.2, -4.96, -33.8],
    yaw: 2.39,
    pitch: -0.1,
    teleport: true,
  },
  {
    id: 'moonfall',
    position: [8.6, -6.9, 18.4],
    yaw: 1.57,
    pitch: -0.09,
    teleport: true,
  },
]
