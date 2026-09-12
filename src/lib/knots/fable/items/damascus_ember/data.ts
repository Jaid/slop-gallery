import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'damascus_ember',
  number: 194,
  title: 'Damascus Ember',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
    },
  },
  accent: '#ff6a1a',
  highlighted: false,
} as const satisfies KnotData
