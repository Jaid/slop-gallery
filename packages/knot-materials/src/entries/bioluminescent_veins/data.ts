import type {KnotData} from '../../types.ts'

export default {
  id: 'bioluminescent_veins',
  candidateId: 'claude_sonnet',
  title: 'Bioluminescent Veins',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A quiet pulse carries starlight through a body made of night.',
  placeholder: {
    color: '#00ffc8',
    shading: 'liquid',
  },
} as const satisfies KnotData
