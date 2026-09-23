import type {KnotData} from '../../types.ts'

export default {
  id: 'midnight_prophecy',
  candidateId: 'gpt_sol',
  title: 'Midnight Prophecy',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Moon-dark porcelain remembers every wound in rivers of gold, and whispers through them when you draw near.',
  placeholder: {
    color: '#272438',
    shading: 'smooth',
  },
} as const satisfies KnotData
