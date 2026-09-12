import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_stairway',
  title: 'Bismuth Stairway',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#ff9de6',
  archived: true,
  highlighted: false,
} as const satisfies KnotData
