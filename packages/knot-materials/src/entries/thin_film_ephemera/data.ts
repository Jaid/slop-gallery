import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'thin_film_ephemera',
  candidateId: 'space_bunny',
  title: 'Thin-Film Ephemera',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A film two hundred nanometres thick, holding a whole sunset together until the smallest breath ends it.',
  placeholder: {
    color: '#8fcbe6',
    shading: 'glass',
  },
} as const satisfies KnotData
