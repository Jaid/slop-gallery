import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ventricle_glass',
  title: 'Ventricle Glass',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ff4a6a',
  highlighted: false,
} as const satisfies KnotData
