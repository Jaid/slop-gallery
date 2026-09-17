import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nacre_lattice',
  candidateId: 'hy',
  title: 'Nacre Lattice',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Pearl arranges its layers into a delicate cage for wandering light.',
  placeholder: {
    color: '#d7e3e6',
    shading: 'glass',
  },
} as const satisfies KnotData
