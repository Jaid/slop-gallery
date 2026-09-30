import type {KnotData} from '../../types.ts'

// Mage run: 5WDU20J87Ktg4fx; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'harlequin_mosaic',
  candidateId: 'claude_sonnet',
  title: 'Harlequin Mosaic',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Sonnet 5.5',
      slug: 'anthropic/claude-sonnet-5.5',
      effortLevel: 'high',
    },
  },
  flavorText: 'Ten million years of silica rain settled into a lattice of tiny spheres. Turn it slowly and each mosaic tile lights, one hue at a time.',
  placeholder: {
    color: '#192646',
    shading: 'glass',
  },
} as const satisfies KnotData
