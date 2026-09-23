import type {KnotData} from '../../types.ts'

export default {
  id: 'mycelium_oracle',
  candidateId: 'muse_spark',
  title: 'Mycelium Oracle',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The network grows an answer before the question reaches its roots.',
  placeholder: {
    color: '#b4ff5c',
    shading: 'fabric',
  },
} as const satisfies KnotData
