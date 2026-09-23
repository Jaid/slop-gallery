import type {KnotData} from '../../types.ts'

export default {
  id: 'cartographers_eclipse',
  candidateId: 'minimax',
  title: 'Cartographer\'s Eclipse',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A pocket universe folded into bronze: the whole sky at the moment you stopped looking up.',
  placeholder: {
    color: '#111827',
    shading: 'metal',
  },
} as const satisfies KnotData
