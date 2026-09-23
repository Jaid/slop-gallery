import type {KnotData} from '../../types.ts'

export default {
  id: 'sugar_ribbon',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  title: 'Sugar Ribbon',
  flavorText: 'A confectioner pulled one last ribbon of raspberry and mint, then forgot where its ends should meet.',
  placeholder: {
    color: '#ef7591',
    shading: 'liquid',
  },
  displacement: 0.01,
} as const satisfies KnotData
