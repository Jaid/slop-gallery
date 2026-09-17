import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mnemonic_mercury',
  candidateId: 'muse_spark',
  title: 'Mnemonic Mercury',
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
