import type {KnotData} from '../../types.ts'

export default {
  id: 'ion_wake',
  candidateId: 'grok',
  title: 'Ion Wake',
  harness: 'grok.com',
  author: {
    model: {
      title: 'Grok 4.6',
    },
  },
  flavorText: 'A passing charge leaves a bright trail in an otherwise silent medium.',
  placeholder: {
    color: '#6cf0ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
