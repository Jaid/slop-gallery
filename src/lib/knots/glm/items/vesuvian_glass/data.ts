import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'vesuvian_glass',
  number: 33,
  title: 'Vesuvian Glass',
  author: {
    model: {
      title: 'GLM 5.3'
    }
  },
  accent: '#ff7a41',
  highlighted: false,
  archived: true
} as const satisfies KnotData
