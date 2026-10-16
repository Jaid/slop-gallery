import type {KnotData} from '../../types.ts'

// Mage run: 4eznRMVv3vZMHhr; fixture: knot-material-shaders; result: success.
export default {
  id: 'watered_silk',
  candidateId: 'claude_opus',
  title: 'Watered Silk',
  createdAt: 1792086173,
  harness: 'Mage',
  author: {model: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'high',
  }},
  flavorText: 'Two veils of silk, one just above the other. Neither holds a pattern of its own, yet between them tides of light ebb and flow with every step you take.',
  placeholder: {
    color: '#78786c',
    shading: 'fabric',
  },
} as const satisfies KnotData
