import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'cloisonne_cosmos',
  candidateId: 'space_bunny',
  title: 'Cloisonné Cosmos',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Gold remembers every boundary; the blue beyond it keeps becoming.',
  placeholder: {
    color: '#18456b',
    shading: 'smooth',
  },
} as const satisfies KnotData
