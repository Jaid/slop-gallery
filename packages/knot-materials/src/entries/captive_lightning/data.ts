import type {KnotData} from '../../types.ts'

// Mage run: IgNMLTcxWnW8Pin; fixture: knot-material-shaders.
export default {
  id: 'captive_lightning',
  candidateId: 'claude_opus',
  title: 'Captive Lightning',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A storm sealed in smoked glass, knotted so it can never reach the ground. It reaches for you instead – the closer you stand, the more of it answers.',
  placeholder: {
    color: '#7a18a8',
    shading: 'glass',
  },
} as const satisfies KnotData
