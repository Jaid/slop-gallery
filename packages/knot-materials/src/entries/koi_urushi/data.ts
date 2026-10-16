import type {KnotData} from '../../types.ts'

// Mage run: 77fsRvmePazcbTS; fixture: knot-material-shaders; result: success.
export default {
  id: 'koi_urushi',
  candidateId: 'gemini_argon',
  title: 'Koi Urushi',
  createdAt: 1791968199,
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
