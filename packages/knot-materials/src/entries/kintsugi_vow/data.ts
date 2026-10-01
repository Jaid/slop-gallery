import type {KnotData} from '../../types.ts'

// Mage run: HdWJtzJ2GnPe32p; fixture: knot-material-shaders; result: success.
export default {
  id: 'kintsugi_vow',
  candidateId: 'space_bunny',
  title: 'Kintsugi Vow',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Broken on purpose, so that the light could get in through the seams and never leave the same way.',
  placeholder: {
    color: '#968c78',
    shading: 'smooth',
  },
} as const satisfies KnotData
