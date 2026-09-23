import type {KnotData} from '../../types.ts'

export default {
  id: 'gilded_celadon',
  candidateId: 'deepseek',
  title: 'Gilded Celadon',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The bowl remembers every break, and gilds each one until the wound outshines the whole.',
  displacement: 0.006,
  placeholder: {
    color: '#789680',
    shading: 'smooth',
  },
} as const satisfies KnotData
