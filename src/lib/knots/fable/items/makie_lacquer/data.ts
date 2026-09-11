import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'makie_lacquer',
  number: 95,
  title: 'Maki-e Lacquer',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#f5c451',
  highlighted: true,
} as const satisfies KnotData
