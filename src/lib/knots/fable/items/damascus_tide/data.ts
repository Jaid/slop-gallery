import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'damascus_tide',
  number: 90,
  title: 'Damascus Tide',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#c7d1dc',
  highlighted: false,
} as const satisfies KnotData
