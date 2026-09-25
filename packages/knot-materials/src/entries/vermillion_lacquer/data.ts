import type {KnotData} from '../../types.ts'

// Mage run: BJsZFlj5mQPSiFo; fixture: knot-material-shaders.
export default {
  id: 'vermillion_lacquer',
  candidateId: 'space_bunny',
  title: 'Vermillion Lacquer',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'The final coat of vermilion is still wet, and the gold leaf refuses to stay buried.',
  placeholder: {
    color: '#e52b25',
    shading: 'smooth',
  },
  displacement: 0.000068,
} as const satisfies KnotData
