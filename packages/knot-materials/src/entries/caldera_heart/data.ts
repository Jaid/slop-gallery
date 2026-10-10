import type {KnotData} from '../../types.ts'

// Mage run: BdUi8mU2Rs29CX7; fixture: knot-material-shaders.
export default {
  id: 'caldera_heart',
  candidateId: 'claude_opus',
  title: 'Caldera Heart',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Under a skin of cooling basalt the knot’s molten heart still beats. Each pulse races through the fissures, and the stone glows with what it cannot hold.',
  placeholder: {
    color: '#ad3e17',
    shading: 'stone',
  },
} as const satisfies KnotData
