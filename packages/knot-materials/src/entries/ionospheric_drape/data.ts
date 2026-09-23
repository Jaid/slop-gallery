import type {KnotData} from '../../types.ts'

export default {
  id: 'ionospheric_drape',
  candidateId: 'kimi',
  title: 'Aurora Veil',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'The upper atmosphere lets down a curtain of drifting green fire.',
  placeholder: {
    color: '#5ff2b0',
    shading: 'smooth',
  },
} as const satisfies KnotData
