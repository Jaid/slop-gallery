import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'auric_joinery',
  candidateId: 'deepseek',
  title: 'Auric Joinery',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The break was never hidden – it was filled with gold, and the bowl became worth more than before.',
  placeholder: {
    color: '#6f6046',
    shading: 'stone',
  },
} as const satisfies KnotData
