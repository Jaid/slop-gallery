import type {KnotData} from '../../types.ts'

export default {
  id: 'basalt_psalm',
  candidateId: 'grok',
  title: 'Basalt Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The rock cooled while it was still singing. The hymn is the shape of that last heat.',
  displacement: 0.008,
  placeholder: {
    color: '#66513c',
    shading: 'stone',
  },
} as const satisfies KnotData
