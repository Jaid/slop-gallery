import type {KnotData} from '../../types.ts'

export default {
  id: 'amber_memory',
  candidateId: 'gpt_luna',
  title: 'Amber Memory',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'Sunset sleeps inside old amber: fern shadows, suspended pollen and one impossible summer kept forever.',
  displacement: 0.001,
  placeholder: {
    color: '#c77a24',
    shading: 'glass',
  },
} as const satisfies KnotData
