import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'coralline_crown',
  candidateId: 'gpt_astra',
  title: 'Coralline Crown',
  harness: 'Codex',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  flavorText: 'The sea fashions a crown for a sovereign it has never seen.',
  placeholder: {
    color: '#8ce6cf',
    shading: 'smooth',
  },
  displacement: 0.085,
} as const satisfies KnotData
