import type {KnotData} from '../../types.ts'

// Mage run: H32IciRDAWJfwki; fixture: knot-material-shaders; result: success.
export default {
  id: 'abyssal_lace',
  candidateId: 'claude_sonnet',
  title: 'Abyssal Lace',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'Eight rows of living lace beat rainbows into the dark. Nothing here is lit from outside – the creature simply cannot help but shine.',
  placeholder: {
    color: '#052a47',
    shading: 'glass',
  },
} as const satisfies KnotData
