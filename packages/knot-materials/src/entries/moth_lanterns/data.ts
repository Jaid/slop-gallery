import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'moth_lanterns',
  candidateId: 'gpt_sol',
  title: 'Moth Lanterns',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'At twilight, luminous wings beat soundlessly under translucent green skin, carrying fireflies toward the center of the knot.',
  placeholder: {
    color: '#174b39',
    shading: 'glass',
  },
} as const satisfies KnotData
