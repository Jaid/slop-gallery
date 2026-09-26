import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'amber_vigil',
  candidateId: 'space_bunny',
  title: 'Amber Vigil',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A vigil kept in resin - honeyed light sunk through ten million winters, a breath of cloud still trapped inside it.',
  placeholder: {
    color: '#ff7a12',
    shading: 'glass',
  },
} as const satisfies KnotData
