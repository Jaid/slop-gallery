import type {KnotData} from '../../types.ts'

// Mage run: 5WDU20J87Ktg4fx; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'celestial_brocade',
  candidateId: 'claude_sonnet',
  title: 'Celestial Brocade',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'Someone stitched the night sky into velvet by candlelight, one gold thread per star. Walk around it and the whole cloth breathes light.',
  placeholder: {
    color: '#1a1450',
    shading: 'fabric',
  },
} as const satisfies KnotData
