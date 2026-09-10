import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'moire_sanctum',
  number: 92,
  title: 'Moiré Sanctum',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1'
    }
  },
  accent: '#d4af37',
  highlighted: false
} as const satisfies KnotData
