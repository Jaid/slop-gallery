import type {KnotData} from '../../types.ts'

// Mage run: D2pmfQp7iycRJKh; fixture: knot-material-shaders; result: success.
export default {
  id: 'captive_sun',
  candidateId: 'muse_wonder',
  title: 'Captive Sun',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  displacement: 0.007,
  flavorText: 'A star persuaded into sculpture – still boiling in golden cells, cooling into spots, and tearing gold at the rim.',
  placeholder: {
    color: '#ff9e18',
    shading: 'glass',
  },
} as const satisfies KnotData
