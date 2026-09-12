import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'diamond_cathedral',
  number: 118,
  title: 'Diamond Cathedral',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#e8fbff',
  highlighted: false,
} as const satisfies KnotData
