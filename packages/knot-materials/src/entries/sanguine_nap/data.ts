import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'sanguine_nap',
  candidateId: 'space_bunny',
  title: 'Sanguine Nap',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Crimson pile, laid down by hand and rubbed the wrong way, so the light has to decide what colour it is.',
  placeholder: {
    color: '#580716',
    shading: 'fabric',
  },
} as const satisfies KnotData
