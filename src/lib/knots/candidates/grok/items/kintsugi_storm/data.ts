import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_storm',
  title: 'Kintsugi Storm',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ffd56a',
  highlighted: false,
} as const satisfies KnotData
