import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'winter_orchard',
  candidateId: 'gpt_astra',
  title: 'Winter Orchard',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Beneath blue ice, a garden grows in six directions at once. Its pale branches drink the warmth of your passing.',
  placeholder: {
    color: '#7fb1c8',
    shading: 'glass',
  },
} as const satisfies KnotData
