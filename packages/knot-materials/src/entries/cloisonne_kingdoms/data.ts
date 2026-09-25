import type {KnotData} from '../../types.ts'

// Mage run: 9YA8kP6cid9wkS5; fixture: knot-material-shaders.
// Original identity: cloisonne (Cloisonné).
export default {
  id: 'cloisonne_kingdoms',
  candidateId: 'space_bunny',
  title: 'Cloisonné Kingdoms',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Tiny kingdoms of color are held in gold, bright as stained sunrise.',
  placeholder: {
    color: '#087f83',
    shading: 'smooth',
  },
} as const satisfies KnotData
