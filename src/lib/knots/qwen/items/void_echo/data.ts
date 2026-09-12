import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'void_echo',
  number: 64,
  title: 'Singularity',
  author: {
    model: {
      title: 'Qwen3.8 Max',
    },
  },
  accent: '#8a2be2',
  highlighted: false,
} as const satisfies KnotData
