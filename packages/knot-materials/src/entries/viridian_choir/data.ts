import type {KnotData} from '../../types.ts'

// Mage run: 4cRctoZrXREvmK4; fixture: knot-material-shaders; result: success.
export default {
  id: 'viridian_choir',
  candidateId: 'gpt_sol',
  title: 'Viridian Choir',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6.1 Sol',
      slug: 'openai/gpt-6.1-sol',
      effortLevel: 'max',
    },
  },
  displacement: 0.008,
  flavorText: 'A miniature forest sings without sound. Ferns uncurl toward your warmth, dew catches the room, and a few grains of sunlight drift between the leaves.',
  placeholder: {
    color: '#398448',
    shading: 'fabric',
  },
} as const satisfies KnotData
