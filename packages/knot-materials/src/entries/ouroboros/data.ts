import type {KnotData} from '../../types.ts'

// Mage run: BdUi8mU2Rs29CX7; fixture: knot-material-shaders.
export default {
  id: 'ouroboros',
  candidateId: 'claude_opus',
  title: 'Ouroboros',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'The serpent has swallowed its own tail and gone on gliding, through itself, forever. Each scale holds a different rainbow, and none of them is ever at rest.',
  placeholder: {
    color: '#413020',
    shading: 'metal',
  },
} as const satisfies KnotData
