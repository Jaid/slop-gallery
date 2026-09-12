import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'wrought_nebula',
  number: 43,
  title: 'Wrought Nebula',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#e56bff',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
