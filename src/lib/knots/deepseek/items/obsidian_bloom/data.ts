import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_bloom',
  number: 18,
  title: 'Obsidian Bloom',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#ff7a3c',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
