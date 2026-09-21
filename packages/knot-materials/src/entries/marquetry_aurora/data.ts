import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'marquetry_aurora',
  candidateId: 'gpt_terra',
  title: 'Marquetry Aurora',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Walnut, maple and quiet brass are fitted into a nocturnal current, a hand-made dawn traveling through the grain.',
  displacement: 0.008,
  placeholder: {
    color: '#7b4b2b',
    shading: 'smooth',
  },
} as const satisfies KnotData
