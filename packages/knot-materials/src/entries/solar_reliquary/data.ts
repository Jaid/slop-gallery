import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_reliquary',
  candidateId: 'gpt_astra',
  title: 'Solar Reliquary',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'A golden vessel preserves the warmth of a day that has already ended.',
  placeholder: {
    color: '#e6bd62',
    shading: 'smooth',
  },
} as const satisfies KnotData
