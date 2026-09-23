import type {KnotData} from '../../types.ts'

export default {
  id: 'petal_testament',
  candidateId: 'gpt_astra',
  title: 'Petal Testament',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.0018,
  flavorText: 'Unsent letters have taught themselves to blossom. Every paper petal holds a crease where a voice almost became a word.',
  placeholder: {
    color: '#cfa8ad',
    shading: 'smooth',
  },
} as const satisfies KnotData
