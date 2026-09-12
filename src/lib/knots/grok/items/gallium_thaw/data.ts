import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'gallium_thaw',
  number: 153,
  title: 'Gallium Thaw',
  harness: 'grok.com Build',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#d7e0ea',
  highlighted: false,
} as const satisfies KnotData
