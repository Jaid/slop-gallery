import type {KnotData} from '../../types.ts'

export default {
  id: 'diamond_cathedral',
  candidateId: 'muse_spark',
  title: 'Diamond Cathedral',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Light kneels in a chamber built entirely from its own reflections.',
  placeholder: {
    color: '#e8fbff',
    shading: 'smooth',
  },
} as const satisfies KnotData
