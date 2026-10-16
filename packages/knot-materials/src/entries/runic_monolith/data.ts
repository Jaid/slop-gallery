import type {KnotData} from '../../types.ts'

export default {
  id: 'runic_monolith',
  candidateId: 'kimi',
  title: 'Runic Monolith',
  createdAt: 1_789_231_507,
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Old marks glow on a stone whose language seems older than its maker.',
  placeholder: {
    color: '#43ffd0',
    shading: 'smooth',
  },
} as const satisfies KnotData
