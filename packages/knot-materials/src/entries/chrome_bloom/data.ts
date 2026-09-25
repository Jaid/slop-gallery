import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'chrome_bloom',
  candidateId: 'space_bunny',
  title: 'Chrome Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A living alloy learns the color of every sky, then keeps one impossible sunrise.',
  placeholder: {
    color: '#a6ccd9',
    shading: 'metal',
  },
} as const satisfies KnotData
