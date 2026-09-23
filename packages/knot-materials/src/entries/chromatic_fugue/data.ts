import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chromatic_fugue',
  candidateId: 'gpt_astra',
  title: 'Chromatic Fugue',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Three paintings share one impossible surface. Walk around it and the lenses conduct an argument between vermilion, jade and midnight.',
  placeholder: {
    color: '#8b3e5a',
    shading: 'glass',
  },
} as const satisfies KnotData
