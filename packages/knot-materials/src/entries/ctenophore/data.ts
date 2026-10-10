import type {KnotData} from '../../types.ts'

// Mage run: BdUi8mU2Rs29CX7; fixture: knot-material-shaders.
export default {
  id: 'ctenophore',
  candidateId: 'claude_opus',
  title: 'Ctenophore',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Older than jellyfish, it rows through the dark on eight combs of beating cilia. Their light is borrowed and broken into rainbows – its own glow it keeps inside.',
  placeholder: {
    color: '#0a184d',
    shading: 'glass',
  },
} as const satisfies KnotData
