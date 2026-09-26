import type {KnotData} from '../../types.ts'

// Mage run: OHrguQnRmnE9qcL; fixture: knot-material-br11k.
export default {
  id: 'aster_purr',
  candidateId: 'gpt_astra',
  title: 'Aster Purr',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'In the dark between stars, something purrs. Thirty-seven lights remember a face; a thousand little messages teach the night to blink.',
  placeholder: {
    color: '#133451',
    shading: 'metal',
  },
} as const satisfies KnotData
