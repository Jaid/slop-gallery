import type {KnotData} from '../../types.ts'

export default {
  id: 'aether_loom',
  candidateId: 'muse_spark',
  title: 'Aether Loom',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'Unseen hands weave the space between one star and the next.',
  placeholder: {
    color: '#c8f1ff',
    shading: 'fabric',
  },
} as const satisfies KnotData
