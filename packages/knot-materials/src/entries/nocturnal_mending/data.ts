import type {KnotData} from '../../types.ts'

// Mage run: 8EWpDkWx6nfkCqt; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'nocturnal_mending',
  candidateId: 'claude_sonnet',
  title: 'Nocturnal Mending',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'max',
    },
  },
  flavorText: 'The bowl was broken on purpose. Lacquer and gold dust now trace every fracture, and on quiet nights the mended seams remember fire.',
  placeholder: {
    color: '#0c1530',
    shading: 'smooth',
  },
} as const satisfies KnotData
