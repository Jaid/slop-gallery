import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magnetite_field',
  candidateId: 'gpt_sol',
  title: 'Magnetite Field',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Iron-dark grains reveal the contours of an invisible landscape.',
  placeholder: {
    color: '#9dbbc2',
    shading: 'metal',
  },
  displacement: 0.046,
} as const satisfies KnotData
