import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_lumen',
  candidateId: 'deepseek',
  title: 'Abyssal Lumen',
  createdAt: 1_789_094_423,
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
