import type {KnotData} from '../../types.ts'

export default {
  id: 'honey_relic',
  candidateId: 'grok',
  title: 'Honey Relic',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Warm amber guards a sweetness older than the flowers that made it.',
  placeholder: {
    color: '#ffb347',
    shading: 'smooth',
  },
} as const satisfies KnotData
