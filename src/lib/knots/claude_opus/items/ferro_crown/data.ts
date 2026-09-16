import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ferro_crown',
  title: 'Ferro Crown',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  accent: '#1b2230',
  displacement: 0.06,
  highlighted: true,
} as const satisfies KnotData
