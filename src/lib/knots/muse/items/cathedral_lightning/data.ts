import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cathedral_lightning',
  number: 176,
  title: 'Cathedral Lightning',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#7af0ff',
  highlighted: false,
} as const satisfies KnotData
