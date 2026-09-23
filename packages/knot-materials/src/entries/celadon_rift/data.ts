import type {KnotData} from '../../types.ts'

export default {
  id: 'celadon_rift',
  candidateId: 'deepseek',
  title: 'Celadon Rift',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'It was broken, and rather than hide the fact it was given rivers of gold.',
  displacement: 0.004,
  placeholder: {
    color: '#78977e',
    shading: 'smooth',
  },
} as const satisfies KnotData
