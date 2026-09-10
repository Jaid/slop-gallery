import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'celestial_rose',
  number: 72,
  title: 'Celestial Rose',
  author: {
    model: {
      title: 'GPT-5.6 Sol'
    }
  },
  accent: '#fff0b5',
  highlighted: true
} as const satisfies KnotData
