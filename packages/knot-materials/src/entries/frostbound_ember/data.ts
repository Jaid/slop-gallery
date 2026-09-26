import type {KnotData} from '../../types.ts'

// Mage run: 7EtWKdJKgEioEdL; fixture: knot-material-shaders.
export default {
  id: 'frostbound_ember',
  candidateId: 'claude_opus',
  title: 'Frostbound Ember',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Winter sealed a small fire inside the ice. Stand close, and the warmth of your body opens a window for it.',
  placeholder: {
    color: '#b9cde4',
    shading: 'glass',
  },
} as const satisfies KnotData
