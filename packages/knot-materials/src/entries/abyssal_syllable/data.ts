import type {KnotData} from '../../types.ts'

export default {
  id: 'abyssal_syllable',
  candidateId: 'deepseek',
  title: 'Abyssal Syllable',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'The ocean has hidden a last blue syllable inside this shell.',
  placeholder: {
    color: '#19f7d2',
    shading: 'smooth',
  },
} as const satisfies KnotData
