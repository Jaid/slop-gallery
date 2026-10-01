import type {KnotData} from '../../types.ts'

// Mage run: HdWJtzJ2GnPe32p; fixture: knot-material-shaders; result: success.
export default {
  id: 'crimson_nap',
  candidateId: 'space_bunny',
  title: 'Crimson Nap',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A century of shoulders has brushed the pile flat; the woven vine under it only appears to whoever leans close.',
  placeholder: {
    color: '#6f0b17',
    shading: 'fabric',
  },
} as const satisfies KnotData
