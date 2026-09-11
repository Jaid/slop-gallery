import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelium_oracle',
  number: 119,
  title: 'Mycelium Oracle',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#b4ff5c',
  highlighted: false,
} as const satisfies KnotData
