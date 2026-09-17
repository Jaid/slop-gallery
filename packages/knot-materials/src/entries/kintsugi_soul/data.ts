import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_soul',
  candidateId: 'hy',
  title: 'Kintsugi Soul',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'The repaired places have become the brightest part of the whole.',
  placeholder: {
    color: '#ffb457',
    shading: 'stone',
  },
} as const satisfies KnotData
