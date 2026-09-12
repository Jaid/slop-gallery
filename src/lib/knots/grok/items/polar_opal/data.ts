import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'polar_opal',
  title: 'Polar Opal',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  accent: '#ff7ad9',
  highlighted: false,
} as const satisfies KnotData
