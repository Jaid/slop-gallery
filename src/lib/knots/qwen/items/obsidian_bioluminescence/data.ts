import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_bioluminescence',
  number: 57,
  title: 'Obsidian Leviathan',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#00e5ff',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
