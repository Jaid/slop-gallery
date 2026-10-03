import type {KnotData} from '../../types.ts'

// Mage run: HU72JSGdKyp7pBO; fixture: knot-material-shaders; result: success.
export default {
  id: 'sidereal_alloy',
  candidateId: 'gpt_sol',
  title: 'Sidereal Alloy',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Iron cooled between the stars, slowly enough to learn their geometry. Every silver blade is a sentence older than Earth.',
  placeholder: {
    color: '#657482',
    shading: 'metal',
  },
} as const satisfies KnotData
