import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'sunken_cathedral',
  number: 20,
  title: 'Sunken Cathedral',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#4fd2ff',
  highlighted: false,
} as const satisfies KnotData
