import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'abyssal_silk',
  candidateId: 'space_bunny',
  title: 'Abyssal Silk',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'The ocean kept one ribbon of night, and the moon keeps changing its hem.',
  placeholder: {
    color: '#4b1e62',
    shading: 'fabric',
  },
} as const satisfies KnotData
