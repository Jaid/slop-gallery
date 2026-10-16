import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'murano_millefiori',
  candidateId: 'gemini_argon',
  title: 'Murano Millefiori',
  createdAt: 1792017078,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Bundled glass canes bloom into starry rosettes suspended at three depths. Copper aventurine flecks catch the light like sunken sparks of gold.',
  placeholder: {
    color: '#a39ea3',
    shading: 'glass',
  },
} as const satisfies KnotData
