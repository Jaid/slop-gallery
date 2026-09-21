import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solenoid',
  candidateId: 'deepseek',
  title: 'Solenoid',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Wind a mile of copper around a prayer and let the current sing.',
  displacement: 0.009,
  placeholder: {
    color: '#a65b2a',
    shading: 'metal',
  },
} as const satisfies KnotData
