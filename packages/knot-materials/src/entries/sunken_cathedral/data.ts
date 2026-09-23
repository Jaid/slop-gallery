import type {KnotData} from '../../types.ts'

export default {
  id: 'sunken_cathedral',
  candidateId: 'gpt_astra',
  title: 'Sunken Cathedral',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
    },
  },
  flavorText: 'An underwater cathedral gathers daylight where its roof once met the sky.',
  placeholder: {
    color: '#8cdeef',
    shading: 'smooth',
  },
} as const satisfies KnotData
