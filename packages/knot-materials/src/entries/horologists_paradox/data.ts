import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'horologists_paradox',
  candidateId: 'gpt_astra',
  title: "Horologist's Paradox",
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Every gear agrees on the hour; none agree on which way time moves.',
  placeholder: {
    color: '#d9b16b',
    shading: 'smooth',
  },
} as const satisfies KnotData
