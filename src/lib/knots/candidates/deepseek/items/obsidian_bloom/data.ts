import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_bloom',
  title: 'Obsidian Bloom',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  accent: '#ff7a3c',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
