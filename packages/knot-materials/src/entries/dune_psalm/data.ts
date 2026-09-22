import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'dune_psalm',
  candidateId: 'gpt_astra',
  title: 'Dune Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'The desert writes in layers of honey, chalk and rose. Lean close enough and the smallest grains still remember the wind.',
  displacement: 0.01,
  placeholder: {
    color: '#d4a36f',
    shading: 'stone',
  },
} as const satisfies KnotData
