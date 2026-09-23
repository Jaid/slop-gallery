import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_lumen',
  candidateId: 'deepseek',
  title: 'Abyssal Lumen',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.013,
  flavorText: 'No sun ever touched this body. It rows with light instead, and every stroke spills a small private rainbow.',
  placeholder: {
    color: '#0b0f1e',
    shading: 'glass',
  },
} as const satisfies KnotData
