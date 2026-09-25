import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'velvet_occultation',
  candidateId: 'space_bunny',
  title: 'Velvet Occultation',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'On a midnight thread, cats assemble from starlight and refuse to be named.',
  placeholder: {
    color: '#16103d',
    shading: 'smooth',
  },
} as const satisfies KnotData
