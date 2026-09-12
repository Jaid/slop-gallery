import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinnabar_edict',
  number: 160,
  title: 'Cinnabar Edict',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#e31c13',
  highlighted: false,
} as const satisfies KnotData
