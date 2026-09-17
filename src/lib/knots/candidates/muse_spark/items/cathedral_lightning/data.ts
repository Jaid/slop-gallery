import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cathedral_lightning',
  title: 'Cathedral Lightning',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  accent: '#7af0ff',
  highlighted: true,
} as const satisfies KnotData
