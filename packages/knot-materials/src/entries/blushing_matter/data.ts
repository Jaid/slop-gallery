import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'blushing_matter',
  candidateId: 'gpt_astra',
  title: 'Blushing Matter',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'This unfamiliar substance seems embarrassed by your attention.',
  placeholder: {
    color: '#f66d8b',
    shading: 'smooth',
  },
} as const satisfies KnotData
