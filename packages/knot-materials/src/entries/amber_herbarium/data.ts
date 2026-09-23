import type {KnotData} from '../../types.ts'

export default {
  id: 'amber_herbarium',
  candidateId: 'gpt_astra',
  title: 'Amber Herbarium',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'A forest folded into a drop of honey, still dreaming of the wind that once moved its smallest leaves.',
  placeholder: {
    color: '#c27a1f',
    shading: 'glass',
  },
} as const satisfies KnotData
