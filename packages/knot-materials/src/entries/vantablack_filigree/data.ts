import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vantablack_filigree',
  candidateId: 'hy',
  title: 'Vantablack Filigree',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'Delicate lines of light cling to the edge of an almost complete darkness.',
  placeholder: {
    color: '#ff2a5f',
    shading: 'smooth',
  },
} as const satisfies KnotData
