import type {KnotData} from '../../types.ts'

// Mage run: ActJg0bLJQHug14.
export default {
  id: 'frozen_orbit',
  candidateId: 'space_bunny',
  title: 'Frozen Orbit',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'The winter lattice grows at the edge of perception, where breath becomes crystal.',
  placeholder: {
    color: '#b6ecff',
    shading: 'glass',
  },
} as const satisfies KnotData
