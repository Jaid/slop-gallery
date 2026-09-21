import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cicada_vellum',
  candidateId: 'gpt_terra',
  title: 'Cicada Vellum',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A shed wing becomes a luminous manuscript, its copper veins holding the last green warmth of a vanished summer.',
  displacement: 0.009,
  placeholder: {
    color: '#9b6c3d',
    shading: 'glass',
  },
} as const satisfies KnotData
