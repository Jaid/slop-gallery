import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nebula_reliquary',
  number: 94,
  title: 'Nebula Reliquary',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#c47bff',
  highlighted: true,
} as const satisfies KnotData
