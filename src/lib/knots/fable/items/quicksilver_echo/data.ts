import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quicksilver_echo',
  number: 93,
  title: 'Quicksilver Echo',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#e6efff',
  highlighted: false,
} as const satisfies KnotData
