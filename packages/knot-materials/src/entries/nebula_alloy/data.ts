import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nebula_alloy',
  candidateId: 'hy',
  title: 'Nebula Alloy',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A foundry beyond the stars has folded colored dust into this metal.',
  placeholder: {
    color: '#1c1e22',
    shading: 'metal',
  },
} as const satisfies KnotData
