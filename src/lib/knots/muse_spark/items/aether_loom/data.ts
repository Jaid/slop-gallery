import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aether_loom',
  title: 'Aether Loom',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  accent: '#c8f1ff',
  highlighted: false,
} as const satisfies KnotData
