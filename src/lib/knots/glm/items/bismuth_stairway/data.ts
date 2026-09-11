import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'bismuth_stairway',
  number: 37,
  title: 'Bismuth Stairway',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#ff9de6',
  highlighted: false,
  archived: true,
} as const satisfies KnotData
