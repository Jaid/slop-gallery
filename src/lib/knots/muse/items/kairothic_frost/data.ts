import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kairothic_frost',
  number: 175,
  title: 'Kairothic Frost',
  harness: 'meta.ai',
  author: {
    model: {
      title: 'Meta Muse Thinking',
    },
  },
  accent: '#a8e6ff',
  highlighted: false,
  displacement: 0.018,
} as const satisfies KnotData
