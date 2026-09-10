import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'bismuth_singularity',
  number: 25,
  title: 'Bismuth Singularity',
  author: {
    model: {
      title: 'Gemini 3.6 Flash'
    }
  },
  accent: '#ff62df',
  highlighted: false,
  archived: true
} as const satisfies KnotData
