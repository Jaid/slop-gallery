import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'velvet_herbarium',
  candidateId: 'gpt_sol',
  title: 'Velvet Herbarium',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A garden embroidered in dusk-gold thread sleeps beneath wine-dark velvet, until the light brushes its leaves awake.',
  placeholder: {
    color: '#542034',
    shading: 'fabric',
  },
} as const satisfies KnotData
