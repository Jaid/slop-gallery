import type {KnotData} from '../../types.ts'

// Mage run: 77fsRvmePazcbTS; fixture: knot-material-shaders; result: success.
export default {
  id: 'seraphim_glass',
  candidateId: 'gemini_argon',
  title: 'Seraphim Glass',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'low',
    },
  },
  flavorText: 'Gothic rose windows of gold-ruby and cobalt glass hold a vaulted nave inside; step around the knot and colored sunbeams sweep the dark.',
  placeholder: {
    color: '#6c4f49',
    shading: 'glass',
  },
} as const satisfies KnotData
