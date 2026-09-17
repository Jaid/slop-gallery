import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quicksilver_aurora',
  candidateId: 'muse_spark',
  title: 'Quicksilver Aurora',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Northern light slips across mercury like a sky poured into a bowl.',
  placeholder: {
    color: '#7df9ff',
    shading: 'liquid',
  },
} as const satisfies KnotData
