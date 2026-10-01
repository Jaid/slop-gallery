import type {KnotData} from '../../types.ts'

// Mage run: MDsU2CH3XEff3jd; fixture: knot-material-shaders; result: success.
export default {
  id: 'cilia',
  candidateId: 'space_bunny',
  title: 'Cilia',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.0025,
  flavorText: 'Eight rows of comb plates beat in time, and every one of them is a prism small enough to argue with a rainbow.',
  placeholder: {
    color: '#3c7985',
    shading: 'glass',
  },
} as const satisfies KnotData
