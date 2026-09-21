import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'turquoise_heartwood',
  candidateId: 'gpt_astra',
  title: 'Turquoise Heartwood',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'A forest folds its years into polished chambers. Turquoise rivers thread the grain, carrying a slow song back to the roots.',
  placeholder: {
    color: '#5a3f27',
    shading: 'smooth',
  },
} as const satisfies KnotData
