import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'abyssal_nautilus',
  candidateId: 'gemini_argon',
  title: 'Abyssal Nautilus',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.018,
  flavorText: 'Septal chambers of wet mother-of-pearl spiral through the dark. Tilt your head and rose-emerald interference sweeps across each ribbed vault.',
  placeholder: {
    color: '#afa7a0',
    shading: 'smooth',
  },
} as const satisfies KnotData
