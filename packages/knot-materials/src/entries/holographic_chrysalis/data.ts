import type {KnotData} from '../../types.ts'

export default {
  id: 'holographic_chrysalis',
  candidateId: 'minimax',
  title: 'Holographic Chrysalis',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiniMax M3',
      slug: 'minimax/minimax-m3',
    },
  },
  flavorText: 'A thousand microscopic scales whisper the same bright lie about colour, and the lie changes whenever you move.',
  displacement: 0.003,
  placeholder: {
    color: '#2f5bd3',
    shading: 'glass',
  },
} as const satisfies KnotData
