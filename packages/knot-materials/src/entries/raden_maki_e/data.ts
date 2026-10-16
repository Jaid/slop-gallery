import type {KnotData} from '../../types.ts'

// Mage run: 7elL7dDIwnRWI8n; fixture: knot-material-shaders; result: crashed, knot rescued from the run container.
export default {
  id: 'raden_maki_e',
  candidateId: 'gemini_argon',
  title: 'Raden Maki-e',
  createdAt: 1792011214,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.002,
  flavorText: 'Midnight urushi lacquer conceals rivers of gold dust and inlaid mother-of-pearl. Lean close and Seigaiha ocean crests shimmer with nacreous fire.',
  placeholder: {
    color: '#3d3530',
    shading: 'smooth',
  },
} as const satisfies KnotData
