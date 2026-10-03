import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'lenticular_oracle',
  candidateId: 'claude_sonnet',
  title: 'Lenticular Oracle',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'The picture is not on the surface – it lives in the angle. Walk around the oracle and it changes its mind.',
  placeholder: {
    color: '#773994',
    shading: 'smooth',
  },
} as const satisfies KnotData
