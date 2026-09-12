import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_rift',
  number: 139,
  title: 'Obsidian Rift',
  harness: 'chat.z.ai',
  author: {
    model: {
      title: 'GLM 5.3',
      effortLevel: 'max',
    },
  },
  accent: '#ff5a1f',
  highlighted: false,
} as const satisfies KnotData
