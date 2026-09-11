import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'porcelain_constellation',
  number: 121,
  title: 'Porcelain Constellation',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3-contributor',
      effortLevel: 'xhigh',
    },
  },
  accent: '#ffd873',
  highlighted: false,
} as const satisfies KnotData
