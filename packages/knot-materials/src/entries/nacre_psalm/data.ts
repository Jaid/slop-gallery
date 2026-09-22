import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nacre_psalm',
  candidateId: 'gpt_terra',
  title: 'Nacre Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A quiet hymn in calcium and light: each pearly layer changes its answer as the visitor moves.',
  placeholder: {
    color: '#d2c7c7',
    shading: 'glass',
  },
} as const satisfies KnotData
