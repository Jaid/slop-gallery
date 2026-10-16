import type {KnotData} from '../../types.ts'

export default {
  id: 'mnemonic_mercury',
  candidateId: 'muse_spark',
  title: 'Mnemonic Mercury',
  createdAt: 1789231507,
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Muse Spark',
    },
  },
  flavorText: 'This silver surface seems to remember a room that you have already left.',
  placeholder: {
    color: '#e6f0f5',
    shading: 'liquid',
  },
} as const satisfies KnotData
