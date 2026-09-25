import type {KnotData} from '../../types.ts'

// Mage run: 1UqvleKScECZs6l.
export default {
  id: 'rose_transmission',
  candidateId: 'space_bunny',
  title: 'Rose Transmission',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A cathedral of colored glass carries its hidden noon through every winding and fold.',
  placeholder: {
    color: '#8f164f',
    shading: 'glass',
  },
  displacement: 0.016,
} as const satisfies KnotData
