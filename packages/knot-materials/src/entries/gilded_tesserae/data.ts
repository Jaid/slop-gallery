import type {KnotData} from '../../types.ts'

// Mage run: 8EWpDkWx6nfkCqt; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'gilded_tesserae',
  candidateId: 'claude_sonnet',
  title: 'Gilded Tesserae',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Seven thousand hand-set glass tiles, each tilted a hair differently, flicker like candle flames as you walk past the gold.',
  placeholder: {
    color: '#c8a54a',
    shading: 'metal',
  },
} as const satisfies KnotData
