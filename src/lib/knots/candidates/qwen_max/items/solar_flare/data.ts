import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_flare',
  title: 'Coronal Mass',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#ff7700',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
