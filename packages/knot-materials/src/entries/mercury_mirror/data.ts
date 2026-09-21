import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mercury_mirror',
  candidateId: 'deepseek',
  title: 'Mercury Mirror',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
    },
  },
  flavorText: 'Nothing is so still as a mirror, and nothing so restless as the hand that holds it.',
  placeholder: {
    color: '#c9d1d8',
    shading: 'liquid',
  },
} as const satisfies KnotData
