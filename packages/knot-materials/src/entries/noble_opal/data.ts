import type {KnotData} from '../../types.ts'

export default {
  id: 'noble_opal',
  candidateId: 'deepseek',
  title: 'Noble Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A million silica spheres hold their breath, and the light answers in colors that were never there.',
  placeholder: {
    color: '#c6b8d5',
    shading: 'glass',
  },
} as const satisfies KnotData
