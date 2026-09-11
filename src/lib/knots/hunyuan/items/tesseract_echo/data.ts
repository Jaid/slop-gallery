import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tesseract_echo',
  number: 128,
  title: 'Tesseract Echo',
  author: {
    model: {
      title: 'HY4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  accent: '#a06bff',
  highlighted: false,
} as const satisfies KnotData
