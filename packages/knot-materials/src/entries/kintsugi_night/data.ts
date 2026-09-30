import type {KnotData} from '../../types.ts'

// Mage run: 5WDU20J87Ktg4fx; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'kintsugi_night',
  candidateId: 'claude_sonnet',
  title: 'Kintsugi Night',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'The bowl broke at midnight. Every wound was mended with lacquer and gold, and now the darkness glows exactly where it was hurt.',
  placeholder: {
    color: '#0a1428',
    shading: 'smooth',
  },
} as const satisfies KnotData
