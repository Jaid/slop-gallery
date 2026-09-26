import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'lantern_mycelium',
  candidateId: 'space_bunny',
  title: 'Lantern Mycelium',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.02,
  flavorText: 'Under the bark of a fallen century, something patient has been building lanterns out of patience and water.',
  placeholder: {
    color: '#1e150e',
    shading: 'smooth',
  },
} as const satisfies KnotData
