import type {KnotData} from '../../types.ts'

// Mage run: CbMOkykhfBD7NuC; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'mandarin_brocade',
  candidateId: 'claude_haiku',
  title: 'Mandarin Brocade',
  createdAt: 1791758163,
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Haiku 5.5',
      slug: 'anthropic/claude-haiku-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Gold floats over midnight silk in a seigaiha wave pattern, and a single current of light runs the full length of the weave.',
  placeholder: {
    color: '#0b1428',
    shading: 'fabric',
  },
} as const satisfies KnotData
