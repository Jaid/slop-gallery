import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nocturne_opal',
  title: 'Nocturne Opal',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  accent: '#8a6cff',
  highlighted: true,
} as const satisfies KnotData
