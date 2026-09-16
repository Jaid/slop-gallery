import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'void_echo',
  title: 'Singularity',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#8a2be2',
  highlighted: true,
} as const satisfies KnotData
