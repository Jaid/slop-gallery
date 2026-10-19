import type {Surroundings} from './Surroundings.ts'

import {knotLayout} from 'knot-materials/exhibition.ts'

import {knotFloorOrigin, knotFloorTile, knotGalleryBounds} from '../../gallery/knotGallery.ts'

/** Knottingham’s exhibition hall as metals mirror it: checkered marble under rows of LED panels, between crimson velvet walls. */
const knottinghamSurroundings: Surroundings = {
  floor: {
    y: 0,
    color: '#e4dfd4',
    checker: '#16110f',
    tile: knotFloorTile,
    origin: knotFloorOrigin,
    veining: 0.3,
  },
  walls: {
    color: '#5e121a',
    baseboard: '#1b1a1a',
    distance: 8,
    accents: ['#d9a63a', '#8a3fa0', '#2f7fb0', '#c84a2a', '#5e121a'],
  },
  ceiling: {
    height: knotGalleryBounds.height,
    color: '#6f6b67',
    lights: {
      color: '#fffdf5',
      intensity: 3,
      size: [2.4, 2.2],
      spacing: [knotLayout.itemSpacing, knotLayout.rowSpacing],
      origin: [knotLayout.slotX(0), knotLayout.rowZ(0)],
    },
  },
}

export default knottinghamSurroundings
