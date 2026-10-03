import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'candlelit_tesserae',
  candidateId: 'claude_sonnet',
  title: 'Candlelit Tesserae',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Ten thousand glass petals, each tilted by a mason’s thumb. Carry a candle past them and the whole vault remembers how to burn.',
  placeholder: {
    color: '#e3a62f',
    shading: 'metal',
  },
} as const satisfies KnotData
