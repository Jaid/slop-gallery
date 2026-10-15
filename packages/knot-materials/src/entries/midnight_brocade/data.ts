import type {KnotData} from '../../types.ts'

// Mage run: 4ayQMqfdM3WbrB2; fixture: knot-material-shaders; result: success.
export default {
  id: 'midnight_brocade',
  candidateId: 'claude_fable',
  title: 'Midnight Brocade',
  harness: 'Mage',
  author: {model: {
    title: 'Claude Fable 5.1',
    slug: 'anthropic/claude-fable-5.1',
    effortLevel: 'high',
  }},
  flavorText: 'Silk woven for a court that no longer exists. Gold thread blooms through the weave, and the whole cloth changes its mind about color as you pass.',
  placeholder: {
    color: '#5d5266',
    shading: 'fabric',
  },
} as const satisfies KnotData
