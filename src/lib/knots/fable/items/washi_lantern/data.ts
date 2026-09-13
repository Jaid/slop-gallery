import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'washi_lantern',
  title: 'Washi Lantern',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  accent: '#ffb36a',
  highlighted: false,
} as const satisfies KnotData
