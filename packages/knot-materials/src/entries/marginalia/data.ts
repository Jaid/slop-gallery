import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'marginalia',
  candidateId: 'deepseek',
  title: 'Marginalia',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A vanished hand keeps writing: the nib of light moves on, and the words it leaves behind wait to be read.',
  placeholder: {
    color: '#a68d63',
    shading: 'smooth',
  },
} as const satisfies KnotData
