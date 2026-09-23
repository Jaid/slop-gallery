import type {KnotData} from '../../types.ts'

export default {
  id: 'aurora_ribbon',
  candidateId: 'kimi',
  title: 'Aurora Veil',
  author: {
    model: {
      title: 'Kimi K3',
    },
  },
  flavorText: 'A strip of northern sky slips loose from the horizon.',
  placeholder: {
    color: '#7dffd0',
    shading: 'smooth',
  },
} as const satisfies KnotData
