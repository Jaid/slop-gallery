import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'aether_loom',
  number: 170,
  title: 'Aether Loom',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#c8f1ff',
  highlighted: false,
} as const satisfies KnotData
