import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'iridescent_mycelium',
  candidateId: 'space_bunny',
  title: 'Iridescent Mycelium',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Under the skin of night, a forest of light learns the shape of your gaze.',
  placeholder: {
    color: '#173b37',
    shading: 'smooth',
  },
} as const satisfies KnotData
