import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'octahedrite',
  candidateId: 'space_bunny',
  title: 'Octahedrite',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.006,
  flavorText: 'Cut once and acid-bitten, a cooling schedule four billion years long writes itself out in ribbons of iron and nickel.',
  placeholder: {
    color: '#79828e',
    shading: 'metal',
  },
} as const satisfies KnotData
