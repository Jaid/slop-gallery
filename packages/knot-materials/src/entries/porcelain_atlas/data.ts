import type {KnotData} from '../../types.ts'

export default {
  id: 'porcelain_atlas',
  candidateId: 'gpt_astra',
  title: 'Porcelain Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Cobalt seas migrate beneath a porcelain sky. The gold meridians remain, mapping countries that have not yet dreamed of land.',
  placeholder: {
    color: '#bbcad5',
    shading: 'smooth',
  },
} as const satisfies KnotData
