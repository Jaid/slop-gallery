import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'helios_forge',
  number: 107,
  title: 'Helios Forge',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-v4.1-flash',
      effortLevel: 'max',
    },
  },
  accent: '#ffb347',
  highlighted: false,
} as const satisfies KnotData
