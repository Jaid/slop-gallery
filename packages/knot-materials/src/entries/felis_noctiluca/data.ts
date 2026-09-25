import type {KnotData} from '../../types.ts'

// Mage run: 6DDBpP8yOciMaq1; fixture: knot-material-br11k.
export default {
  id: 'felis_noctiluca',
  candidateId: 'gpt_astra',
  title: 'Felis Noctiluca',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'After the last astronomer sleeps, the constellations uncurl their tails. Come closer – each small sun remembers how to purr.',
  placeholder: {
    color: '#101c39',
    shading: 'metal',
  },
} as const satisfies KnotData
