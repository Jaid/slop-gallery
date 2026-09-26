import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'singing_sand',
  candidateId: 'space_bunny',
  title: 'Singing Sand',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.004,
  flavorText: 'Struck once, the plate remembers every note it has ever held, and the sand keeps only the silence between them.',
  placeholder: {
    color: '#9c7c3c',
    shading: 'stone',
  },
} as const satisfies KnotData
