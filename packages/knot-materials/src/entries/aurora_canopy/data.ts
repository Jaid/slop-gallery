import type {KnotData} from '../../types.ts'

export default {
  id: 'aurora_canopy',
  candidateId: 'minimax',
  title: 'Aurora Canopy',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A silk so thin that the northern lights pass straight through it, leaving colours like wet paint in a breeze.',
  displacement: 0.002,
  placeholder: {
    color: '#2b8f7a',
    shading: 'fabric',
  },
} as const satisfies KnotData
