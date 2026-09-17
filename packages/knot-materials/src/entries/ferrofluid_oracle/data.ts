import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluid_oracle',
  candidateId: 'grok',
  title: 'Ferrofluid Oracle',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'The black pool raises its answer in a forest of shining spires.',
  placeholder: {
    color: '#c5d0e0',
    shading: 'liquid',
  },
  displacement: 0.095,
} as const satisfies KnotData
