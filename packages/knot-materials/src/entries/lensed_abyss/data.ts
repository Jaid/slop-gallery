import type {KnotData} from '../../types.ts'

export default {
  id: 'lensed_abyss',
  candidateId: 'deepseek',
  title: 'Lensed Abyss',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Light arrives, is thanked for its service and is never seen again.',
  placeholder: {
    color: '#161018',
    shading: 'smooth',
  },
} as const satisfies KnotData
