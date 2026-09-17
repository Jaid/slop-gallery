import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferrothorn',
  candidateId: 'gpt_astra',
  title: 'Ferrothorn',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A polished wilderness of thorns follows the lines of an invisible field.',
  placeholder: {
    color: '#98b8c4',
    shading: 'metal',
  },
  displacement: 0.048,
} as const satisfies KnotData
