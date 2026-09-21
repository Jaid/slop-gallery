import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'paper_pilgrimage',
  candidateId: 'gpt_astra',
  title: 'Paper Pilgrimage',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Ten thousand quiet shores, cut from a single unwritten book. The tide turns one page at a time.',
  placeholder: {
    color: '#d8b7a0',
    shading: 'smooth',
  },
} as const satisfies KnotData
