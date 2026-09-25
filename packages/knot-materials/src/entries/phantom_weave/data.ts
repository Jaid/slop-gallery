import type {KnotData} from '../../types.ts'

// Mage run: 9YA8kP6cid9wkS5; fixture: knot-material-shaders.
export default {
  id: 'phantom_weave',
  candidateId: 'space_bunny',
  title: 'Phantom Weave',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Silver threads breathe across a midnight loom, catching a ghost of gold.',
  placeholder: {
    color: '#253a86',
    shading: 'fabric',
  },
} as const satisfies KnotData
