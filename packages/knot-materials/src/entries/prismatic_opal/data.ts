import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'prismatic_opal',
  candidateId: 'space_bunny',
  title: 'Prismatic Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A pale stone keeps a handful of captured skies, each one a different weather.',
  placeholder: {
    color: '#b9c8d1',
    shading: 'glass',
  },
} as const satisfies KnotData
