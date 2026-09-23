import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opaline_canticle',
  candidateId: 'deepseek',
  title: 'Opaline Canticle',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Milk that keeps a different rainbow for every direction you look, sung by lattices of glass no eye can see.',
  placeholder: {
    color: '#c9d6ff',
    shading: 'glass',
  },
} as const satisfies KnotData
