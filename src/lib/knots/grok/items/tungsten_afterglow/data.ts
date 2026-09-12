import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tungsten_afterglow',
  title: 'Tungsten Afterglow',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ff6a22',
  highlighted: false,
} as const satisfies KnotData
