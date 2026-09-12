import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'magnetic_ink',
  number: 38,
  title: 'Magnetic Ink',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  accent: '#8f7bff',
  highlighted: false,
} as const satisfies KnotData
