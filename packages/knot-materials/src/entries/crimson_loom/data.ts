import type {KnotData} from '../../types.ts'

export default {
  id: 'crimson_loom',
  candidateId: 'gpt_astra',
  title: 'Crimson Loom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Someone wove the final minute of sunset into a royal cloth. The gold thread keeps trying to pull the evening back apart.',
  placeholder: {
    color: '#6f2033',
    shading: 'fabric',
  },
} as const satisfies KnotData
