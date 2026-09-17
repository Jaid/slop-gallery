import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cataphote_rouge',
  candidateId: 'gpt_astra',
  title: 'Cataphote Rouge',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A red glimmer returns to the place your gaze began.',
  placeholder: {
    color: '#f7472c',
    shading: 'smooth',
  },
} as const satisfies KnotData
