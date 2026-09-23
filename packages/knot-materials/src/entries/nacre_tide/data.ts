import type {KnotData} from '../../types.ts'

export default {
  id: 'nacre_tide',
  candidateId: 'grok',
  title: 'Nacre Tide',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The shell remembers every tide as a thinner color than the one before it.',
  placeholder: {
    color: '#d6d0ce',
    shading: 'glass',
  },
} as const satisfies KnotData
