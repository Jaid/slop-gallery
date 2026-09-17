import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'eclipse_marrow',
  title: 'Eclipse Marrow',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ff8a5c',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
