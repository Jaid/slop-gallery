import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hoar_frost',
  candidateId: 'hy',
  title: 'Hoar Frost',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: "The night's last breath has become a coat of silver needles.",
  placeholder: {
    color: '#eaf6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
