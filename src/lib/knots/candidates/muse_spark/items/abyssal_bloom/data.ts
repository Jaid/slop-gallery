import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_bloom',
  title: 'Abyssal Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  accent: '#00f0ff',
  archived: true,
  highlighted: false,
  displacement: 0.02,
} as const satisfies KnotData
