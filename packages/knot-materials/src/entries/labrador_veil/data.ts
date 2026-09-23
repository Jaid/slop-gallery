import type {KnotData} from '../../types.ts'

export default {
  id: 'labrador_veil',
  candidateId: 'deepseek',
  title: 'Labrador Veil',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A stone that keeps the northern lights asleep inside its cleavage planes.',
  displacement: 0.0006,
  placeholder: {
    color: '#28445c',
    shading: 'stone',
  },
} as const satisfies KnotData
