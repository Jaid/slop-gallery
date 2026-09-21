import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'murmuration_silk',
  candidateId: 'gpt_luna',
  title: 'Murmuration Silk',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'A silk sky carries a flock of tiny copper birds; they wheel, settle and rise as you pass.',
  displacement: 0.002,
  placeholder: {
    color: '#214756',
    shading: 'fabric',
  },
} as const satisfies KnotData
