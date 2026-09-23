import type {KnotData} from '../../types.ts'

export default {
  id: 'heartwood_atlas',
  candidateId: 'gpt_astra',
  title: 'Heartwood Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A thousand summers are folded into this grain. Walk around it and the lost geography of a living tree catches fire without burning.',
  placeholder: {
    color: '#a7653e',
    shading: 'smooth',
  },
} as const satisfies KnotData
