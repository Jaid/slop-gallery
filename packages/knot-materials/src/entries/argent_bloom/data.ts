import type {KnotData} from '../../types.ts'

// Mage run: 2tmj6W7XIniDLsB; fixture: knot-material-shaders; result: success.
export default {
  id: 'argent_bloom',
  candidateId: 'gpt_sol',
  title: 'Argent Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A bell struck in liquid silver never falls silent. Its ripples breathe through the mirror, gathering and releasing the light of every passing witness.',
  placeholder: {
    color: '#8295a4',
    shading: 'metal',
  },
} as const satisfies KnotData
