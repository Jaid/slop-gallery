import type {KnotData} from '../../types.ts'

export default {
  id: 'mycelium_veil',
  candidateId: 'hy',
  title: 'Mycelium Veil',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Fine threads draw a soft curtain between the visible world and its hidden growth.',
  placeholder: {
    color: '#c6ff8f',
    shading: 'fabric',
  },
} as const satisfies KnotData
