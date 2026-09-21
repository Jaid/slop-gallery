import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelial_moon',
  candidateId: 'gpt_luna',
  title: 'Mycelial Moon',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'Under a dark woodland skin, a patient constellation of mycelium carries moonlight from root to root.',
  displacement: 0.002,
  placeholder: {
    color: '#355e4b',
    shading: 'stone',
  },
} as const satisfies KnotData
