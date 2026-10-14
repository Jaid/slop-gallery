import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'hopper_labyrinth',
  candidateId: 'gemini_argon',
  title: 'Hopper Labyrinth',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.017,
  flavorText: 'Hopper crystals grow in terraced labyrinths of liquid metal. Each step of the ziggurat traps a different thickness of oxide, blazing from gold to violet.',
  placeholder: {
    color: '#63585f',
    shading: 'metal',
  },
} as const satisfies KnotData
