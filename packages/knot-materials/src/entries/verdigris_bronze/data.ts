import type {KnotData} from '../../types.ts'

export default {
  id: 'verdigris_bronze',
  candidateId: 'claude_sonnet',
  title: 'Verdigris Bronze',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Green weather slowly writes its history across the old bronze.',
  placeholder: {
    color: '#4c9a7a',
    shading: 'metal',
  },
} as const satisfies KnotData
