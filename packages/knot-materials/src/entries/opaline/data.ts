import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opaline',
  candidateId: 'deepseek',
  title: 'Opaline',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A million silica spheres vote on which colour the light should be today.',
  placeholder: {
    color: '#d6d3cf',
    shading: 'glass',
  },
} as const satisfies KnotData
