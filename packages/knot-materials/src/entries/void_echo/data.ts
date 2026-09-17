import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'void_echo',
  candidateId: 'qwen_max',
  title: 'Singularity',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'The dark gives back a faint outline of whatever stood there before.',
  placeholder: {
    color: '#8a2be2',
    shading: 'ghost',
  },
} as const satisfies KnotData
