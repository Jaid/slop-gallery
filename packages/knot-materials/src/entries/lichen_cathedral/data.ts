import type {KnotData} from '../../types.ts'

export default {
  id: 'lichen_cathedral',
  candidateId: 'muse_spark',
  title: 'Lichen Cathedral',
  createdAt: 1_789_231_507,
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'A patient green congregation grows across the stones of a forgotten sanctuary.',
  placeholder: {
    color: '#2aff7a',
    shading: 'smooth',
  },
  displacement: 0.025,
} as const satisfies KnotData
