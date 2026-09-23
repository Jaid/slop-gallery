import type {KnotData} from '../../types.ts'

export default {
  id: 'kairothic_frost',
  candidateId: 'muse_spark',
  title: 'Kairothic Frost',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'These crystals wait for the right moment, not the next one.',
  placeholder: {
    color: '#a8e6ff',
    shading: 'glass',
  },
  displacement: 0.018,
} as const satisfies KnotData
