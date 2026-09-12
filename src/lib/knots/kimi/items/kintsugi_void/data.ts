import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_void',
  number: 56,
  title: 'Kintsugi Void',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  accent: '#ffd75e',
  highlighted: false,
} as const satisfies KnotData
