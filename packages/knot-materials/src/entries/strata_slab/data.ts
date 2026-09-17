import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'strata_slab',
  candidateId: 'hy',
  title: 'Strata Slab',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Layer after layer, the stone remembers how slowly a landscape is made.',
  placeholder: {
    color: '#cbb99c',
    shading: 'stone',
  },
} as const satisfies KnotData
