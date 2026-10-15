import type {KnotData} from '../../types.ts'

// Mage run: 4eznRMVv3vZMHhr; fixture: knot-material-shaders; result: success.
export default {
  id: 'cuttlefish',
  candidateId: 'claude_opus',
  title: 'Cuttlefish',
  harness: 'Mage',
  author: {model: {
    title: 'Claude Opus 5.5',
    slug: 'anthropic/claude-opus-5.5',
    effortLevel: 'high',
  }},
  flavorText: 'Living skin, ten thousand pigment sacs wide. Dark clouds pass over it while it thinks. When you come close, it decides what you are, and tells you in stripes.',
  placeholder: {
    color: '#817269',
    shading: 'smooth',
  },
} as const satisfies KnotData
