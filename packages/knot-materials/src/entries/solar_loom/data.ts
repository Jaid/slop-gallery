import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'solar_loom',
  candidateId: 'space_bunny',
  title: 'Solar Loom',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Sunlight falls through a woven heaven and arrives as gold, indigo and thunder.',
  placeholder: {
    color: '#bf873a',
    shading: 'fabric',
  },
} as const satisfies KnotData
