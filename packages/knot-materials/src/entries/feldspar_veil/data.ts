import type {KnotData} from '../../types.ts'

// Mage run: HdWJtzJ2GnPe32p; fixture: knot-material-shaders; result: success.
export default {
  id: 'feldspar_veil',
  candidateId: 'space_bunny',
  title: 'Feldspar Veil',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Under a mirror polish the feldspar keeps a cold fire of its own, and it only shows itself to whoever moves.',
  placeholder: {
    color: '#2c333d',
    shading: 'stone',
  },
} as const satisfies KnotData
