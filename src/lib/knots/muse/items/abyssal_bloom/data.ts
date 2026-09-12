import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_bloom',
  number: 114,
  title: 'Abyssal Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#00f0ff',
  highlighted: false,
  displacement: 0.02,
} as const satisfies KnotData
