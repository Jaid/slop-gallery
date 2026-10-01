import type {KnotData} from '../../types.ts'

// Mage run: HdWJtzJ2GnPe32p; fixture: knot-material-shaders; result: success.
export default {
  id: 'morpho_wing',
  candidateId: 'space_bunny',
  title: 'Morpho Wing',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A thousand lamellae of chitin, each one a tilted grating, agree to be blue only while you are standing in exactly the right place.',
  placeholder: {
    color: '#18a9ff',
    shading: 'fabric',
  },
} as const satisfies KnotData
