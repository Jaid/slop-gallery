import type {KnotData} from '../../types.ts'

export default {
  id: 'mithril_lattice',
  candidateId: 'minimax',
  title: 'Mithril Lattice',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A thousand rings of moonlight drawn into one quiet chain. None of them remember who wove them.',
  displacement: 0.003,
  placeholder: {
    color: '#aeb7c2',
    shading: 'metal',
  },
} as const satisfies KnotData
