import type {KnotData} from '../../types.ts'

export default {
  id: 'cinder_bloom',
  candidateId: 'gpt_terra',
  title: 'Cinder Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Terra',
      slug: 'openai/gpt-5.6-terra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Cooling obsidian remembers the instant it flowered, holding embers beneath a skin of ash and glaze.',
  displacement: 0.004,
  placeholder: {
    color: '#51251c',
    shading: 'stone',
  },
} as const satisfies KnotData
