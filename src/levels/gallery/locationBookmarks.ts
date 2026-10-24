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
    position: [-6.07, -3.48, -16.52],
    yaw: -0.56,
    pitch: -0.08,
    teleport: true,
  },
  {
    id: 'moonfall',
    position: [8.6, -6.9, 18.4],
    yaw: 1.57,
    pitch: -0.09,
    teleport: true,
  },
  // Camera snapshot views for ?spawn only; an eyeHeight holds the camera mid-jump or close to the floor.
  {
    id: 'camera_lobby_high',
    position: [-3.49, 1.55, -7.25],
    yaw: -1.06,
    pitch: -0.23,
    eyeHeight: 2,
  },
  {
    id: 'camera_dine_to_salon',
    position: [10.79, 0.02, 7.43],
    yaw: -0.15,
    pitch: -0.04,
    eyeHeight: 0.6,
  },
  {
    id: 'camera_corridor_sienna',
    position: [-21.39, -0.64, 8.98],
    yaw: -2.23,
    pitch: 0.01,
  },
  {
    id: 'camera_corridor_low',
    position: [-35.08, -4.98, 11.97],
    yaw: -0.77,
    pitch: 0.12,
    eyeHeight: 0.25,
  },
  {
    id: 'camera_lodge_high',
    position: [-20.78, -3.55, -37.85],
    yaw: 2.31,
    pitch: -0.29,
    eyeHeight: 1.6,
  },
  {
    id: 'camera_oculus_tunnel',
    position: [7.16, -8.36, -16.13],
    yaw: 0.53,
    pitch: 0,
    eyeHeight: 3.6,
  },
  {
    id: 'camera_fountain_above',
    position: [1.47, 1.55, -14.33],
    yaw: 2.57,
    pitch: -0.5,
    eyeHeight: 1.6,
  },
]
