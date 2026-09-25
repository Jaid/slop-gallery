import type {KnotData} from '../../types.ts'

// Mage run: 29lWdAQmWzVXPwF; fixture: knot-material-br11k.
export default {
  id: 'aster_familiar',
  candidateId: 'gpt_sol',
  title: 'Aster Familiar',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Between the last stars, small nocturnal gods stitch themselves together, blink at their witnesses and quietly follow them home.',
  placeholder: {
    color: '#132754',
    shading: 'fabric',
  },
} as const satisfies KnotData
