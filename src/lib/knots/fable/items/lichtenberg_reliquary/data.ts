import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichtenberg_reliquary',
  number: 195,
  title: 'Lichtenberg Reliquary',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#6d8dff',
  highlighted: false,
} as const satisfies KnotData
