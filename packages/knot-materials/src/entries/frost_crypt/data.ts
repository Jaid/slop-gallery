import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'frost_crypt',
  candidateId: 'hy',
  title: 'Frost Crypt',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Pale crystals seal a chamber whose inhabitants are only echoes.',
  placeholder: {
    color: '#eaf6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
