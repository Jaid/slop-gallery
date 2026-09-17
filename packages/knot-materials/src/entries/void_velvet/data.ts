import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'void_velvet',
  candidateId: 'hy',
  title: 'Void Velvet',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A plush darkness opens around a light that never quite reaches its center.',
  placeholder: {
    color: '#040406',
    shading: 'fabric',
  },
} as const satisfies KnotData
