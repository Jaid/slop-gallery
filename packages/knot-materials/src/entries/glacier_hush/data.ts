import type {KnotData} from '../../types.ts'

// Mage run: HdWJtzJ2GnPe32p; fixture: knot-material-shaders; result: success.
export default {
  id: 'glacier_hush',
  candidateId: 'space_bunny',
  title: 'Glacier Hush',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Ten thousand winters of snowfall pressed into one slow afternoon, and the air from that afternoon is still trapped inside it.',
  placeholder: {
    color: '#6e9bb8',
    shading: 'glass',
  },
} as const satisfies KnotData
