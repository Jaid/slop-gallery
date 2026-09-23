import type {KnotData} from '../../types.ts'

export default {
  id: 'loom_of_hours',
  candidateId: 'deepseek',
  title: 'Loom of Hours',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Every thread was dipped in a different hour of the day, and the loom wove them together.',
  placeholder: {
    color: '#9c1229',
    shading: 'fabric',
  },
} as const satisfies KnotData
