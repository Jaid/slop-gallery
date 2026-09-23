import type {KnotData} from '../../types.ts'

export default {
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
} as const satisfies KnotData
