import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'candy_lacquer',
  candidateId: 'gpt_terra',
  title: 'Candy Lacquer',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Cobalt, coral and mint fragments slide beneath a sugar-black varnish, changing partners when the orbit becomes sweet enough.',
  displacement: 0.011,
  placeholder: {
    color: '#dd3f77',
    shading: 'smooth',
  },
} as const satisfies KnotData
