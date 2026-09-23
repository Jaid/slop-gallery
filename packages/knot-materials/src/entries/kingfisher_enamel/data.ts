import type {KnotData} from '../../types.ts'

export default {
  id: 'kingfisher_enamel',
  candidateId: 'gpt_astra',
  title: 'Kingfisher Enamel',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'A kingfisher left its colors in the furnace. Brass veins now cradle pools of turquoise, lapis and molten honey.',
  placeholder: {
    color: '#1d8a8a',
    shading: 'smooth',
  },
} as const satisfies KnotData
