import type {Surroundings} from './Surroundings.ts'

import {floorThickness, floorTile} from '../../gallery/floors.ts'
import lobby from '../../gallery/lobby.ts'
import {lobbyCeiling} from '../../gallery/lobbyCeiling.ts'
import lowerGallery from '../../gallery/lowerGallery.ts'

/**
 * The rooms that metals mirror, modeled after how each room looks on screen.
 *
 * Only what reads in a blurry reflection matters: the floor’s brightness and tiles, the wall color with a scatter of artworks, and where the ceiling’s lights are.
 *
 * Knottingham’s room lives in its own module, so the gallery’s bundle does not pull in the knot exhibition its layout depends on.
 */
export const surroundings = {
  /** travertine floor and walls under the coffered laylights */
  lobby: {
    floor: {
      y: 0,
      color: '#d8cfbe',
      seam: '#a39b8b',
      tile: floorTile,
      origin: [-lobby.width / 2, lobby.northZ],
      veining: 0.25,
    },
    walls: {
      color: '#ddd6c6',
      baseboard: '#cdc4b0',
      distance: 6,
      accents: ['#2e4a6c', '#9a6a33', '#41584a', '#b48d4c', '#1c3d6d', '#6d3b2c'],
    },
    ceiling: {
      height: lobbyCeiling.underside,
      color: '#d6d1c2',
      lights: {
        color: '#fff8ea',
        intensity: 2.2,
        size: [3, 3],
        spacing: [lobbyCeiling.bay, lobbyCeiling.bay],
        origin: [0, (lobby.northZ + lobby.southZ) / 2 + lobbyCeiling.bay / 2],
      },
    },
  },
  /** dark slate tower room, lit by the glazed opening in the Lobby floor above */
  oculus: {
    floor: {
      y: lowerGallery.floorY,
      color: '#4a4d4b',
      tile: 4,
      veining: 0.2,
    },
    walls: {
      color: '#3b3f3e',
      baseboard: '#2b2e2d',
      distance: 7,
      accents: ['#3a4d7a', '#8f723e', '#cfcfc6', '#5d3f6e'],
    },
    ceiling: {
      height: -floorThickness - lowerGallery.oculus.ceiling.thickness - lowerGallery.floorY,
      color: '#202221',
      lights: {
        color: '#d4e0cf',
        intensity: 1.6,
        size: lobby.opening.size,
        spacing: [40, 40],
        origin: lobby.opening.center,
      },
    },
  },
} satisfies Record<string, Surroundings>
