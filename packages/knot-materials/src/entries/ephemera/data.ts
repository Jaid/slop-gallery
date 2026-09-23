import type {KnotData} from '../../types.ts'

export default {
  id: 'ephemera',
  candidateId: 'deepseek',
  title: 'Ephemera',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A film of water one thousand atoms thick, holding every color of the sky for as long as it dares.',
  placeholder: {
    color: '#8fcbe6',
    shading: 'glass',
  },
} as const satisfies KnotData
