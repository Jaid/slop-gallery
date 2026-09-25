import type {KnotData} from '../../types.ts'

// Mage run: BJsZFlj5mQPSiFo; fixture: knot-material-shaders.
export default {
  id: 'tourmaline_nebula',
  candidateId: 'space_bunny',
  title: 'Tourmaline Nebula',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A dark tourmaline crystal contains a weather system from a planet that has no name.',
  placeholder: {
    color: '#20134b',
    shading: 'glass',
  },
  displacement: 0.000032,
} as const satisfies KnotData
