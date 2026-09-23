import type {KnotData} from '../../types.ts'

export default {
  id: 'mycelial_lace',
  candidateId: 'gpt_astra',
  title: 'Mycelial Lace',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Beneath a quiet forest, a pale intelligence embroiders the dark. Each soft pulse carries a message too old for words.',
  placeholder: {
    color: '#c1bca5',
    shading: 'stone',
  },
} as const satisfies KnotData
