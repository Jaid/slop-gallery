import type {KnotData} from '../../types.ts'

export default {
  id: 'hadal_blossom',
  candidateId: 'muse_spark',
  title: 'Abyssal Bloom',
  harness: 'none',
  author: {
    model: {
      title: 'Muse Spark 1.3',
      slug: 'meta/muse-spark-1.3',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A flower opens where the ocean is deepest and no season ever changes.',
  placeholder: {
    color: '#00f0ff',
    shading: 'fabric',
  },
  displacement: 0.02,
} as const satisfies KnotData
