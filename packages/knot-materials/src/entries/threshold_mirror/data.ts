import type {KnotData} from '../../types.ts'

export default {
  id: 'threshold_mirror',
  candidateId: 'claude_fable',
  title: 'Threshold Mirror',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'The reflection looks less like this room than the entrance to another one.',
  placeholder: {
    color: '#7ff5ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
