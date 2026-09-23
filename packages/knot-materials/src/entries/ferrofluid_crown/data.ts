import type {KnotData} from '../../types.ts'

export default {
  id: 'ferrofluid_crown',
  candidateId: 'kimi',
  title: 'Ferrofluid Crown',
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Liquid points gather into a coronation that never quite becomes solid.',
  placeholder: {
    color: '#6f7dff',
    shading: 'liquid',
  },
} as const satisfies KnotData
