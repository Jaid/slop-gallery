import type {KnotData} from '../../types.ts'

// Mage run: BdUi8mU2Rs29CX7; fixture: knot-material-shaders.
export default {
  id: 'lightning_ridge',
  candidateId: 'claude_opus',
  title: 'Lightning Ridge',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Black opal from Lightning Ridge, where storms are said to have turned to stone. Its fire, a lattice of silica spheres, burns only for those who stand in the right place.',
  placeholder: {
    color: '#101531',
    shading: 'glass',
  },
} as const satisfies KnotData
