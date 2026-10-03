import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'vesper_panes',
  candidateId: 'claude_sonnet',
  title: 'Vesper Panes',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Evening pours through a thousand patient panes. Each one keeps a different hour, and none of them forgives the dark.',
  placeholder: {
    color: '#1646f0',
    shading: 'glass',
  },
} as const satisfies KnotData
