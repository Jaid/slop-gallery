import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelial_constellation',
  candidateId: 'gpt_terra',
  title: 'Mycelial Constellation',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Beneath a velvet forest floor, luminous hyphae trade starlight in slow pulses only the patient can see.',
  displacement: 0.007,
  placeholder: {
    color: '#31553e',
    shading: 'stone',
  },
} as const satisfies KnotData
