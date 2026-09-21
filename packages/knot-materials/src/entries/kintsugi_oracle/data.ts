import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_oracle',
  candidateId: 'gpt_luna',
  title: 'Kintsugi Oracle',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'A porcelain prophecy breaks open in gold, and every fracture learns the warmth of your gaze.',
  displacement: 0.002,
  placeholder: {
    color: '#251814',
    shading: 'smooth',
  },
} as const satisfies KnotData
