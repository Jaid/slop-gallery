import type {KnotData} from '../../types.ts'

// Mage run: 7EtWKdJKgEioEdL; fixture: knot-material-shaders.
export default {
  id: 'mended_tide',
  candidateId: 'claude_opus',
  title: 'Mended Tide',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'The painted sea broke once and was mended with gold. Its waves still roll on, and they now pass through the scars.',
  placeholder: {
    color: '#dfe9ff',
    shading: 'smooth',
  },
} as const satisfies KnotData
