import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'zero_point_lather',
  candidateId: 'deepseek',
  title: 'Quantum Foam',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'At the edge of stillness, a fine froth refuses to settle into nothing.',
  placeholder: {
    color: '#b18cff',
    shading: 'smooth',
  },
} as const satisfies KnotData
