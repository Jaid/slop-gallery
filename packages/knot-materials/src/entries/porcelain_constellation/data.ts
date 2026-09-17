import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'porcelain_constellation',
  candidateId: 'muse_spark',
  title: 'Porcelain Constellation',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Small stars gather beneath a glaze as pale as an unmarked map.',
  placeholder: {
    color: '#ffd873',
    shading: 'stone',
  },
} as const satisfies KnotData
