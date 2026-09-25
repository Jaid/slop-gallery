import type {KnotData} from '../../types.ts'

// Mage run: BJsZFlj5mQPSiFo; fixture: knot-material-shaders.
export default {
  id: 'mycelial_lumen',
  candidateId: 'space_bunny',
  title: 'Mycelial Lumen',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A forest floor translated into light: roots wander beneath a skin of midnight glass.',
  placeholder: {
    color: '#0d4c4c',
    shading: 'glass',
  },
  displacement: 0.00012,
} as const satisfies KnotData
