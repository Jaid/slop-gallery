import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'frost_oracle',
  candidateId: 'gpt_terra',
  title: 'Frost Oracle',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'A moonlit frost keeps small weather systems and ancient sparks suspended in its translucent blue silence.',
  displacement: 0.002,
  placeholder: {
    color: '#70bfd6',
    shading: 'glass',
  },
} as const satisfies KnotData
