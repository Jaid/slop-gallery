import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'glacier_soul',
  number: 117,
  title: 'Glacier Soul',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#9be8ff',
  highlighted: false,
} as const satisfies KnotData
