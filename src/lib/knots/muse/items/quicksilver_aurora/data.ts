import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quicksilver_aurora',
  number: 116,
  title: 'Quicksilver Aurora',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#7df9ff',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
