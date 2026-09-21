import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'celadon_kintsugi',
  candidateId: 'deepseek',
  title: 'Celadon Kintsugi',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
    },
  },
  flavorText: 'The break is not hidden but honored; where the porcelain failed, gold remembers the shape of the wound.',
  displacement: 0.007,
  placeholder: {
    color: '#82927d',
    shading: 'stone',
  },
} as const satisfies KnotData
