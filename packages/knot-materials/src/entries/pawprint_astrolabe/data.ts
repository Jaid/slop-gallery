import type {KnotData} from '../../types.ts'

// Mage run: ActJg0bLJQHug14.
export default {
  id: 'pawprint_astrolabe',
  candidateId: 'space_bunny',
  title: 'Pawprint Astrolabe',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Dot by dot, sleeping cats map a kingdom no telescope can reach.',
  placeholder: {
    color: '#12182a',
    shading: 'smooth',
  },
} as const satisfies KnotData
