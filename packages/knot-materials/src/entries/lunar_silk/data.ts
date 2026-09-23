import type {KnotData} from '../../types.ts'

export default {
  id: 'lunar_silk',
  candidateId: 'deepseek',
  title: 'Lunar Silk',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Woven from the cold side of the moon, it changes color with every step you take around it.',
  displacement: 0.0004,
  placeholder: {
    color: '#182654',
    shading: 'fabric',
  },
} as const satisfies KnotData
