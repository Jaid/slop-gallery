import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ephemeral_foam',
  candidateId: 'gpt_astra',
  title: 'Ephemeral Assembly',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Each fragile chamber is a small promise the next moment may erase.',
  placeholder: {
    color: '#a3eadd',
    shading: 'liquid',
  },
} as const satisfies KnotData
