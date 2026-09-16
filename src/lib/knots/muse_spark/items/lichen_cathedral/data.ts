import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichen_cathedral',
  title: 'Lichen Cathedral',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  accent: '#2aff7a',
  archived: true,
  highlighted: false,
  displacement: 0.025,
} as const satisfies KnotData
