import type {KnotData} from '../../types.ts'

// Mage run: IgNMLTcxWnW8Pin; fixture: knot-material-shaders.
export default {
  id: 'harlequin_night_opal',
  candidateId: 'claude_opus',
  title: 'Harlequin Night Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 5.5',
      slug: 'anthropic/claude-opus-5.5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Silica spheres, stacked in the dark for a hundred thousand years, hold their fire for whoever keeps moving.',
  placeholder: {
    color: '#050a1c',
    shading: 'glass',
  },
} as const satisfies KnotData
