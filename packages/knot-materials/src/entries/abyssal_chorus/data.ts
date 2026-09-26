import type {KnotData} from '../../types.ts'

// Mage run: 7EtWKdJKgEioEdL; fixture: knot-material-shaders.
export default {
  id: 'abyssal_chorus',
  candidateId: 'claude_opus',
  title: 'Abyssal Chorus',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Eight rows of tiny oars row light through the dark water. Come too close and the whole creature startles into a cold blue song.',
  placeholder: {
    color: '#0a1a3a',
    shading: 'glass',
  },
} as const satisfies KnotData
