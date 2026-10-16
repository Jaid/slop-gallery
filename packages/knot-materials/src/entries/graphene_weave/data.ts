import type {KnotData} from '../../types.ts'

export default {
  id: 'graphene_weave',
  candidateId: 'claude_sonnet',
  title: 'Graphene Weave',
  createdAt: 1789575270,
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A dark fabric finds its strength in the spaces between its bonds.',
  placeholder: {
    color: '#2f2f2f',
    shading: 'fabric',
  },
} as const satisfies KnotData
