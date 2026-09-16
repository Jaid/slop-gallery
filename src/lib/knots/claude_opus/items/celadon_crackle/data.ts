import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'celadon_crackle',
  title: 'Celadon Crackle',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  accent: '#9fc7b4',
  highlighted: false,
} as const satisfies KnotData
