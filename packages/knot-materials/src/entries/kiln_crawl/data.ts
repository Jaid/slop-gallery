import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kiln_crawl',
  candidateId: 'hy',
  title: 'Kiln Crawl',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A glaze retreats across fired clay, leaving islands of deliberate imperfection.',
  placeholder: {
    color: '#ff5a1f',
    shading: 'stone',
  },
} as const satisfies KnotData
