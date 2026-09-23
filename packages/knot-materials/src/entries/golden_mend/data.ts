import type {KnotData} from '../../types.ts'

export default {
  id: 'golden_mend',
  candidateId: 'deepseek',
  title: 'Golden Mend',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'What was broken is not hidden; it is gilded until the wound outshines the whole.',
  displacement: 0.009,
  placeholder: {
    color: '#d4cdbd',
    shading: 'smooth',
  },
} as const satisfies KnotData
