import type {KnotData} from '../../types.ts'

export default {
  id: 'tempest_eye',
  candidateId: 'muse_spark',
  title: 'Tempest Eye',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The calm center watches its own storm turn without ever joining it.',
  placeholder: {
    color: '#9a8aff',
    shading: 'smooth',
  },
} as const satisfies KnotData
