import type {KnotData} from '../../types.ts'

export default {
  id: 'confetti_terrazzo',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  title: 'Confetti Terrazzo',
  flavorText: 'The workshop swept its brightest offcuts into one stone and polished the celebration smooth.',
  placeholder: {
    color: '#e1cbb0',
    shading: 'stone',
  },
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotData
