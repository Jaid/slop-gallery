import type {KnotData} from '../../types.ts'

export default {
  id: 'magma_heart',
  candidateId: 'kimi',
  title: 'Magma Heart',
  createdAt: 1789231507,
  harness: 'kimi.ai',
  author: {
    model: {
      title: 'Kimi K3',
      effortLevel: 'max',
    },
  },
  flavorText: 'Beneath the dark crust, the mountain keeps its own slow heartbeat.',
  placeholder: {
    color: '#ff4d00',
    shading: 'liquid',
  },
} as const satisfies KnotData
