import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cinder_meridian',
  number: 156,
  title: 'Cinder Meridian',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ff6a1a',
  highlighted: false,
} as const satisfies KnotData
