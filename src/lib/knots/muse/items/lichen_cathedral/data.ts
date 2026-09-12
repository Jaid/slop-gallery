import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'lichen_cathedral',
  number: 177,
  title: 'Lichen Cathedral',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#2aff7a',
  highlighted: false,
  displacement: 0.025,
} as const satisfies KnotData
