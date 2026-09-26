import type {KnotData} from '../../types.ts'

// Mage run: 7EtWKdJKgEioEdL; fixture: knot-material-shaders.
export default {
  id: 'watching_stone',
  candidateId: 'claude_opus',
  title: 'Watching Stone',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Gold silk sleeps in the quartz until someone passes. Then a slow bright eye opens along the stone and follows them out of the room.',
  placeholder: {
    color: '#94520c',
    shading: 'stone',
  },
} as const satisfies KnotData
