import type {KnotData} from '../../types.ts'

export default {
  id: 'glacier_soul',
  candidateId: 'muse_spark',
  title: 'Glacier Soul',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: "A cold blue presence stirs beneath the mountain's patient weight.",
  placeholder: {
    color: '#9be8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
