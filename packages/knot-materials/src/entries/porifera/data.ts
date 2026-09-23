import type {KnotData} from '../../types.ts'

export default {
  id: 'porifera',
  candidateId: 'gpt_astra',
  title: 'Porifera',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A porcelain organism dreams in chambers. The pale skin opens onto a cool green labyrinth that breathes without a single lung.',
  placeholder: {
    color: '#d5cfbf',
    shading: 'stone',
  },
} as const satisfies KnotData
