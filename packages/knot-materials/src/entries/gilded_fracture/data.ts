import type {KnotData} from '../../types.ts'

export default {
  id: 'gilded_fracture',
  candidateId: 'deepseek',
  title: 'Gilded Fracture',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Broken once, and mended by someone who believed the cracks deserved gold.',
  placeholder: {
    color: '#25725e',
    shading: 'stone',
  },
} as const satisfies KnotData
