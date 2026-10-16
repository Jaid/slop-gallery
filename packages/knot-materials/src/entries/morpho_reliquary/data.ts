import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'morpho_reliquary',
  candidateId: 'gemini_argon',
  title: 'Morpho Reliquary',
  createdAt: 1792017078,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.011,
  flavorText: 'Shingled chitin scales diffracting electric cobalt and emerald violet shift with every step, parted by dark wing veins of liquid gold.',
  placeholder: {
    color: '#8295a5',
    shading: 'smooth',
  },
} as const satisfies KnotData
