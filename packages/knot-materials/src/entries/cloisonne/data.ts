import type {KnotData} from '../../types.ts'

export default {
  id: 'cloisonne',
  candidateId: 'grok',
  title: 'Cloisonné',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.011,
  flavorText: 'Jewel glass, poured into gardens of gold wire. Each cell is a chapel the size of a fingernail, and its window of shine follows you.',
  placeholder: {
    color: '#0c2f72',
    shading: 'glass',
  },
} as const satisfies KnotData
