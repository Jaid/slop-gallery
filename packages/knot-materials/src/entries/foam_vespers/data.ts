import type {KnotData} from '../../types.ts'

export default {
  id: 'foam_vespers',
  candidateId: 'deepseek',
  title: 'Foam Vespers',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.017,
  flavorText: 'Every film is a small closed world that drains until it forgets color, then fills its lungs and begins the rainbow again.',
  placeholder: {
    color: '#cfe8ff',
    shading: 'glass',
  },
} as const satisfies KnotData
