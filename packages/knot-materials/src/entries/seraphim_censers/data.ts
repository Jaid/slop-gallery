import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'seraphim_censers',
  candidateId: 'gemini_argon',
  title: 'Seraphim Censers',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.012,
  flavorText: 'Pierced gilt bronze opens over a sanctuary of velvet and rubies. Circle the knot and Gothic rose windows reveal a heart of living embers.',
  placeholder: {
    color: '#ba8c67',
    shading: 'metal',
  },
} as const satisfies KnotData
