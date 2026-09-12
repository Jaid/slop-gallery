import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrofluid_oracle',
  number: 148,
  title: 'Ferrofluid Oracle',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#c5d0e0',
  highlighted: false,
  displacement: 0.095,
} as const satisfies KnotData
