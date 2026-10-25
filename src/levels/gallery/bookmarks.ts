import type {CameraBookmark, SpawnBookmark} from '#src/lib/gallery/types.ts'

import {playerSpawn} from './navigation.ts'

/** named player poses for `?spawn` and for T in `?development`, see `src/lib/gallery/bookmarks.ts` */
export const spawnBookmarks: Array<SpawnBookmark> = [
  {
    ...playerSpawn,
    id: 'spawn',
  },
  {
    id: 'fountain',
    position: [-5.8, 0.04, -5.8],
    yaw: -0.74,
    pitch: 0.03,
  },
  {
    id: 'dine',
    position: [16.1, 0.04, 7.4],
    yaw: 0.27,
    pitch: -0.08,
  },
  {
    id: 'salon',
    position: [8.6, 0.04, -18.3],
    yaw: -0.99,
    pitch: -0.03,
  },
  {
    id: 'vesper',
    position: [-18.6, 0.04, 7.4],
    yaw: -0.56,
    pitch: 0.07,
  },
  {
    id: 'sienna',
    position: [-19.4, 0.04, 8.6],
    yaw: -2.4,
    pitch: 0.02,
  },
  {
    id: 'lodge',
    position: [-28.7, -4.96, -38.2],
    yaw: -2.64,
    pitch: -0.03,
  },
  {
    id: 'oculus',
    position: [-6.07, -3.48, -16.52],
    yaw: -0.56,
    pitch: -0.08,
  },
  {
    id: 'moonfall',
    position: [8.6, -6.9, 18.4],
    yaw: 1.57,
    pitch: -0.09,
  },
]

/** named camera views for `?spawn` and `scripts/snap.ts --bookmark`, see `src/lib/gallery/bookmarks.ts` */
export const cameraBookmarks: Array<CameraBookmark> = [
  {
    id: 'moonfall',
    position: [8.63, -4.9, 18.61],
    aim: {
      yaw: 1.56,
      pitch: -0.35,
    },
    fov: 55,
    ratio: 16 / 9,
  },
  {
    id: 'tunnel_exhibition',
    position: [0.08, -7.34, 3.53],
    aim: {
      yaw: 0.02,
      pitch: 0.01,
    },
    fov: 80,
    ratio: 16 / 9,
  },
  {
    id: 'oculus',
    position: [5.97, -2.05, -17.28],
    aim: {
      yaw: 0.64,
      pitch: -0.3,
    },
    fov: 70,
    ratio: 16 / 9,
  },
  {
    id: 'lodge',
    position: [-20.61, -2.03, -37.53],
    aim: {
      yaw: 2.24,
      pitch: -0.33,
    },
    fov: 65,
    ratio: 16 / 9,
  },
  {
    id: 'sienna',
    position: [-18.86, 1.07, 8.4],
    aim: {
      yaw: -2.44,
      pitch: 0.13,
    },
    fov: 65,
    ratio: 16 / 9,
  },
]
