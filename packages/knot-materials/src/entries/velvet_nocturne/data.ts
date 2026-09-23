import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_nocturne',
  candidateId: 'deepseek',
  title: 'Velvet Nocturne',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Face it and the cloth is almost black; walk past and the whole garment catches fire.',
  displacement: 0.032,
  placeholder: {
    color: '#5e0a1c',
    shading: 'fabric',
  },
} as const satisfies KnotData
