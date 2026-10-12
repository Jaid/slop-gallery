import type {KnotData} from '../../types.ts'

// Mage run: ImzJ438LsWTlcom; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'amber_candle',
  candidateId: 'claude_haiku',
  title: 'Amber Candle',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A candle was kept burning for a century, sealed in sap that remembered every flicker and slowly turned to gold.',
  placeholder: {
    color: '#d17c30',
    shading: 'glass',
  },
} as const satisfies KnotData
