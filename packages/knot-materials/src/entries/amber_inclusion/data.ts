import type {KnotData} from '../../types.ts'

export default {
  id: 'amber_inclusion',
  candidateId: 'claude_opus',
  title: 'Amber Inclusion',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A fleeting spark has been granted an eternity inside warm resin.',
  placeholder: {
    color: '#e9a63d',
    shading: 'glass',
  },
} as const satisfies KnotData
