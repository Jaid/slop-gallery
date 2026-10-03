import type {KnotData} from '../../types.ts'

// Mage run: 5RXWnszENQQH6u3; fixture: knot-material-shaders; result: success.
export default {
  id: 'cymatics',
  candidateId: 'space_bunny',
  title: 'Cymatics',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A violin bow dragged across a steel plate throws the sand into the shape of the note. Every frequency is a different animal.',
  placeholder: {
    color: '#0d1014',
    shading: 'metal',
  },
} as const satisfies KnotData
