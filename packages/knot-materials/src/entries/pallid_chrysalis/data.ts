import type {KnotData} from '../../types.ts'

export default {
  id: 'pallid_chrysalis',
  candidateId: 'muse_spark',
  title: 'Pallid Chrysalis',
  createdAt: 1_789_231_507,
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'Something luminous waits behind a shell the color of an unfinished dawn.',
  placeholder: {
    color: '#ffb08a',
    shading: 'smooth',
  },
} as const satisfies KnotData
