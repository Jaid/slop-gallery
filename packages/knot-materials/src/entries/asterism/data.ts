import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'asterism',
  candidateId: 'deepseek',
  title: 'Asterism',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A six-rayed star sleeps inside the blue stone, and wakes only for the light that finds it.',
  placeholder: {
    color: '#244b9b',
    shading: 'glass',
  },
} as const satisfies KnotData
