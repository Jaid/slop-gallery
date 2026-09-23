import type {KnotData} from '../../types.ts'

export default {
  id: 'noble_fire',
  candidateId: 'deepseek',
  title: 'Noble Fire',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A black stone keeps a thousand small fires, and lets you see only the ones you deserve.',
  placeholder: {
    color: '#2b2429',
    shading: 'glass',
  },
} as const satisfies KnotData
