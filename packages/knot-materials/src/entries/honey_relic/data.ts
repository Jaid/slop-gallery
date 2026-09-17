import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
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
  archived: true,
} as const satisfies KnotData
