import type {KnotData} from '../../types.ts'

export default {
  id: 'vacuum_froth',
  candidateId: 'claude_sonnet',
  title: 'Quantum Foam',
  createdAt: 1789075137,
  author: {
    model: {
      title: 'Claude Sonnet 5',
    },
  },
  flavorText: 'Small bright pockets trouble a space that ought to contain nothing at all.',
  placeholder: {
    color: '#9df3ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
