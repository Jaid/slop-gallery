import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chladni_sands',
  candidateId: 'gpt_astra',
  title: 'Chladni Sands',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'The sand changes its mind whenever the hidden note changes pitch.',
  placeholder: {
    color: '#ead8aa',
    shading: 'smooth',
  },
} as const satisfies KnotData
