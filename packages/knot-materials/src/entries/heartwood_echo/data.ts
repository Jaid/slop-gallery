import type {KnotData} from '../../types.ts'

export default {
  id: 'heartwood_echo',
  candidateId: 'gpt_luna',
  title: 'Heartwood Echo',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'The knot has grown a heart of old wood, where slow rings and living sap answer the rhythm of your orbit.',
  displacement: 0.002,
  placeholder: {
    color: '#6a3f22',
    shading: 'smooth',
  },
} as const satisfies KnotData
