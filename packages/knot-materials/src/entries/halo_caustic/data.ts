import type {KnotData} from '../../types.ts'

// Mage run: NKvaWYy8hA4AWQ9.
export default {
  id: 'halo_caustic',
  candidateId: 'grok',
  title: 'Halo Caustic',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Light enters, loses the way, and comes back as a ring that follows you.',
  placeholder: {
    color: '#7ec8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
