import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'play_of_color',
  candidateId: 'deepseek',
  title: 'Play of Color',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Billions of silica spheres vote on a single color; the moment you move, the vote changes.',
  displacement: 0.005,
  placeholder: {
    color: '#9c8fc0',
    shading: 'glass',
  },
} as const satisfies KnotData
