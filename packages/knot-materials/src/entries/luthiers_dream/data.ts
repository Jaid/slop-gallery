import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'luthiers_dream',
  candidateId: 'gpt_astra',
  title: "Luthier's Dream",
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Warm grain keeps the shape of music before the first string is tightened.',
  placeholder: {
    color: '#e6ad61',
    shading: 'smooth',
  },
} as const satisfies KnotData
