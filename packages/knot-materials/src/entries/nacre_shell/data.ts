import type {KnotData} from '../../types.ts'

export default {
  id: 'nacre_shell',
  candidateId: 'hy',
  title: 'Nacre Shell',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: "The sea's patient craftsmanship turns rough beginnings into a luminous shelter.",
  placeholder: {
    color: '#fdf6e3',
    shading: 'glass',
  },
} as const satisfies KnotData
