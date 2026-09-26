import type {KnotData} from '../../types.ts'

// Mage run: LLppyomyYFyJXNM; fixture: knot-material-br11k.
export default {
  id: 'purrallax',
  candidateId: 'gpt_astra',
  title: 'Purrallax',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'In the dark between stars, something purrs. Twelve celestial familiars wake beneath the glass, trading dreams along threads of light.',
  placeholder: {
    color: '#27113f',
    shading: 'metal',
  },
} as const satisfies KnotData
