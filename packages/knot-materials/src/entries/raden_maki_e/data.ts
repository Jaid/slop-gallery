import type {KnotData} from '../../types.ts'

// Mage run: 77fsRvmePazcbTS; fixture: knot-material-shaders; result: success.
export default {
  id: 'raden_maki_e',
  candidateId: 'gemini_argon',
  title: 'Raden Maki-e',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'low',
    },
  },
  flavorText: 'Midnight urushi lacquer holds an autumn koi pond: gold maki-e waves and mother-of-pearl raden shells shimmer above drifting lanterns.',
  placeholder: {
    color: '#827460',
    shading: 'smooth',
  },
} as const satisfies KnotData
