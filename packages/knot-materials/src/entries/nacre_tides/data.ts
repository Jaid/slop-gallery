import type {KnotData} from '../../types.ts'

// Mage run: 5RXWnszENQQH6u3; fixture: knot-material-shaders; result: success.
export default {
  id: 'nacre_tides',
  candidateId: 'space_bunny',
  title: 'Nacre Tides',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'An oyster spent forty years layering patient mirrors. Still water, and the sea comes to see what it built.',
  placeholder: {
    color: '#fff2dc',
    shading: 'glass',
  },
} as const satisfies KnotData
