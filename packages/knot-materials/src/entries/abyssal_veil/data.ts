import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_veil',
  candidateId: 'deepseek',
  title: 'Abyssal Veil',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.008,
  flavorText: 'Something that lives where the light is made instead of received.',
  placeholder: {
    color: '#128a8c',
    shading: 'glass',
  },
} as const satisfies KnotData
