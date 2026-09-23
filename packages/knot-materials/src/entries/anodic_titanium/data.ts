import type {KnotData} from '../../types.ts'

export default {
  id: 'anodic_titanium',
  candidateId: 'claude_opus',
  title: 'Anodic Titanium',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A thin breath of color lies over metal that refuses to age.',
  placeholder: {
    color: '#6f8fc9',
    shading: 'metal',
  },
} as const satisfies KnotData
