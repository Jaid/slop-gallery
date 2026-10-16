import type {KnotData} from '../../types.ts'

// Mage run: 77fsRvmePazcbTS; fixture: knot-material-shaders; result: success.
export default {
  id: 'celestial_armillary',
  candidateId: 'gemini_argon',
  title: 'Celestial Armillary',
  createdAt: 1791968199,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'low',
    },
  },
  flavorText: 'Graduated brass meridians and engraved vernier rings cage a deep indigo planetarium where golden constellations and comets wheel.',
  placeholder: {
    color: '#73665a',
    shading: 'metal',
  },
} as const satisfies KnotData
