import type {KnotData} from '../../types.ts'

// Mage run: NKvaWYy8hA4AWQ9.
export default {
  id: 'constellation_cattery',
  candidateId: 'grok',
  title: 'Constellation Cattery',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Each cat is a handful of stars that agree, for a moment, to be an animal.',
  placeholder: {
    color: '#120c1c',
    shading: 'smooth',
  },
} as const satisfies KnotData
