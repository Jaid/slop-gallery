import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_flare',
  candidateId: 'deepseek',
  title: 'Solar Flare',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
    },
  },
  flavorText: 'A bright lash of stellar fire curls back toward the place that made it.',
  placeholder: {
    color: '#ffd166',
    shading: 'liquid',
  },
} as const satisfies KnotData
