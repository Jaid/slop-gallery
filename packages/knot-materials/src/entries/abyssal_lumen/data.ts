import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_lumen',
  candidateId: 'deepseek',
  title: 'Abyssal Lumen',
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
  archived: true,
} as const satisfies KnotData
