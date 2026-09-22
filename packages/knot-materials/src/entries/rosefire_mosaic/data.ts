import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'rosefire_mosaic',
  candidateId: 'gpt_sol',
  title: 'Rosefire Mosaic',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A rose window without a wall gathers a wandering flame and breaks it into jewel-colored hymns.',
  placeholder: {
    color: '#ac5862',
    shading: 'glass',
  },
} as const satisfies KnotData
