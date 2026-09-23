import type {KnotData} from '../../types.ts'

export default {
  id: 'morpho_chrysalis',
  candidateId: 'deepseek',
  title: 'Morpho Chrysalis',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Wings folded into a knot, still holding the sky they were meant to cross.',
  placeholder: {
    color: '#312a63',
    shading: 'smooth',
  },
} as const satisfies KnotData
