import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tesseract_echo',
  candidateId: 'hy',
  title: 'Tesseract Echo',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'A shape from elsewhere leaves repeating traces as it passes through this room.',
  placeholder: {
    color: '#a06bff',
    shading: 'ghost',
  },
} as const satisfies KnotData
