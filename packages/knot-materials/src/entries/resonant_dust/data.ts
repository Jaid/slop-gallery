import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'resonant_dust',
  candidateId: 'claude_sonnet',
  title: 'Resonant Dust',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'The plate sings a note too low to hear. Step closer and the music grows finer, herding every grain into a new geometry.',
  placeholder: {
    color: '#8a6f45',
    shading: 'stone',
  },
} as const satisfies KnotData
