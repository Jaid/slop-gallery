import type {KnotData} from '../../types.ts'

export default {
  id: 'prism_cathedral',
  candidateId: 'claude_opus',
  title: 'Prism Cathedral',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'The windows have become the walls, and every wall is another window.',
  placeholder: {
    color: '#4f7fe0',
    shading: 'glass',
  },
} as const satisfies KnotData
