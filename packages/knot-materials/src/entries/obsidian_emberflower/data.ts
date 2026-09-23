import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_emberflower',
  candidateId: 'deepseek',
  title: 'Obsidian Emberflower',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'A black flower opens along fractures left by an ancient fire.',
  placeholder: {
    color: '#ff7a3c',
    shading: 'fabric',
  },
} as const satisfies KnotData
