import type {KnotData} from '../../types.ts'

export default {
  id: 'ink_marble',
  candidateId: 'claude_sonnet',
  title: 'Ink Marble',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Dark ink wanders through pale stone as though the page were still wet.',
  placeholder: {
    color: '#2b2b3d',
    shading: 'smooth',
  },
} as const satisfies KnotData
