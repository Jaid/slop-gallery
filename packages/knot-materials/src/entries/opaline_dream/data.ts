import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'opaline_dream',
  candidateId: 'deepseek',
  title: 'Opaline Dream',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A rain of ancient light, caught in stone and taught to remember every color it has ever been.',
  placeholder: {
    color: '#33284d',
    shading: 'glass',
  },
} as const satisfies KnotData
