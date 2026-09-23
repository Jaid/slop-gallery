import type {KnotData} from '../../types.ts'

export default {
  id: 'damascus_tide',
  candidateId: 'claude_fable',
  title: 'Damascus Tide',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Dark and bright metal flow together without ever truly mixing.',
  placeholder: {
    color: '#c7d1dc',
    shading: 'liquid',
  },
} as const satisfies KnotData
