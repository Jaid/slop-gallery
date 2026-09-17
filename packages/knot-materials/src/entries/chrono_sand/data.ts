import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chrono_sand',
  candidateId: 'qwen_max',
  title: 'Chrono Amber',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'Time slips through these grains without ever reaching the bottom.',
  placeholder: {
    color: '#ffcc00',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
