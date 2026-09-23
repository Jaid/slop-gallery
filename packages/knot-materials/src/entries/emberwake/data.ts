import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'emberwake',
  candidateId: 'deepseek',
  title: 'Emberwake',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The stone is only a lid. Underneath it, something still remembers being molten and lifts the light to its seams.',
  placeholder: {
    color: '#201d19',
    shading: 'stone',
  },
} as const satisfies KnotData
