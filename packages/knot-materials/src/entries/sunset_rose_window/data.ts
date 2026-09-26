import type {KnotData} from '../../types.ts'

// Mage run: 7EtWKdJKgEioEdL; fixture: knot-material-shaders.
export default {
  id: 'sunset_rose_window',
  candidateId: 'claude_opus',
  title: 'Sunset Rose Window',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Somewhere inside the knot the sun is setting, and a whole cathedral of colored glass is catching the last of its light.',
  placeholder: {
    color: '#7d243f',
    shading: 'glass',
  },
} as const satisfies KnotData
