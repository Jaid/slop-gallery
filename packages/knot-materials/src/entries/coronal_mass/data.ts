import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'coronal_mass',
  candidateId: 'qwen_max',
  title: 'Coronal Mass',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'A fragment of the sun carries the shape of its escape.',
  placeholder: {
    color: '#ff7700',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
