import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'sidereal_compass',
  candidateId: 'hy',
  title: 'Celestial Astrolabe',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'high',
    },
  },
  flavorText: 'Its fine markings point toward stars rather than any earthly north.',
  placeholder: {
    color: '#e6c27a',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
