import type {KnotData} from '../../types.ts'

// Mage run: 3gQGAbAm59HYY8k; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'lodestone_bloom',
  candidateId: 'claude_haiku',
  title: 'Lodestone Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A black iron tide rises into thorns the moment a magnet walks past, and every spike leans toward you as if you were the lodestone.',
  placeholder: {
    color: '#11171a',
    shading: 'metal',
  },
} as const satisfies KnotData
