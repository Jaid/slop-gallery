import type {KnotData} from '../../types.ts'

export default {
  id: 'desert_glaze',
  candidateId: 'hy',
  title: 'Desert Glaze',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: "A day's heat has dried into the colors of a distant dune.",
  placeholder: {
    color: '#2d5f7a',
    shading: 'smooth',
  },
} as const satisfies KnotData
