import type {KnotData} from '../../types.ts'

// Mage run: 5RXWnszENQQH6u3; fixture: knot-material-shaders; result: success.
export default {
  id: 'damascus',
  candidateId: 'space_bunny',
  title: 'Damascus',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A thousand layers of steel folded into one bar, then ground open to let you count them. The pattern was never drawn.',
  placeholder: {
    color: '#d8e0ea',
    shading: 'metal',
  },
} as const satisfies KnotData
