import type {KnotData} from '../../types.ts'

export default {
  id: 'sable_coronation',
  candidateId: 'gpt_astra',
  title: 'Sable Coronation',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'A royal darkness, sewn with patient suns. The velvet keeps its fire for those who walk beside it.',
  placeholder: {
    color: '#4b1023',
    shading: 'fabric',
  },
} as const satisfies KnotData
