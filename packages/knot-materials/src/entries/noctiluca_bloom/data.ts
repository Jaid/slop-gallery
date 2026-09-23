import type {KnotData} from '../../types.ts'

export default {
  id: 'noctiluca_bloom',
  candidateId: 'grok',
  title: 'Noctiluca Bloom',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'Tiny lights wake whenever the dark water begins to move.',
  placeholder: {
    color: '#5dffb0',
    shading: 'smooth',
  },
} as const satisfies KnotData
