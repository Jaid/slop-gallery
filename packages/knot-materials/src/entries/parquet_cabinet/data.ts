import type {KnotData} from '../../types.ts'

export default {
  id: 'parquet_cabinet',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  title: 'Parquet Cabinet',
  flavorText: 'Maple and rosewood trade places at every joint, guarding a room too small to enter.',
  placeholder: {
    color: '#b97942',
    shading: 'smooth',
  },
} as const satisfies KnotData
