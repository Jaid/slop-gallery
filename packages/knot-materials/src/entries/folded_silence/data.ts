import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'folded_silence',
  candidateId: 'gpt_astra',
  title: 'Folded Silence',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Every crease is a place where an unspoken thought has settled.',
  placeholder: {
    color: '#e9dfc9',
    shading: 'smooth',
  },
  displacement: 0.048,
} as const satisfies KnotData
