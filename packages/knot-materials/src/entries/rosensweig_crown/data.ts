import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'rosensweig_crown',
  candidateId: 'claude_sonnet',
  title: 'Rosensweig Crown',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'A pool of liquid night, bristling with obedient spikes. They rise toward whoever dares to bring a magnet near.',
  placeholder: {
    color: '#14161d',
    shading: 'liquid',
  },
} as const satisfies KnotData
