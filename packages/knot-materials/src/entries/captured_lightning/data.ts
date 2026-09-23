import type {KnotData} from '../../types.ts'

export default {
  id: 'captured_lightning',
  candidateId: 'deepseek',
  title: 'Captured Lightning',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A hundred thousand volts passed through the resin one night, and left its portrait behind.',
  placeholder: {
    color: '#376fae',
    shading: 'glass',
  },
} as const satisfies KnotData
