import type {KnotData} from '../../types.ts'

// Mage run: 7EtWKdJKgEioEdL; fixture: knot-material-shaders.
export default {
  id: 'imperial_guilloche',
  candidateId: 'claude_opus',
  title: 'Imperial Guilloché',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Under a lake of raspberry glass, gold was turned on a rose engine by patient hands. The lines still catch fire, and somewhere inside a small clock is ticking.',
  placeholder: {
    color: '#4a0612',
    shading: 'metal',
  },
} as const satisfies KnotData
