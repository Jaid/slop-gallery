import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vapor_prism',
  candidateId: 'hy',
  title: 'Vapor Prism',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A little drifting mist persuades daylight to reveal its hidden colors.',
  placeholder: {
    color: '#eef2f7',
    shading: 'glass',
  },
} as const satisfies KnotData
