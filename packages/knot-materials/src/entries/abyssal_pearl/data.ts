import type {KnotData} from '../../types.ts'

// Mage run: EC58pRKjMMMNqsv; fixture: knot-material-shaders; result: success.
export default {
  id: 'abyssal_pearl',
  candidateId: 'muse_wonder',
  title: 'Abyssal Pearl',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A thousand nacre tiles laid by patient tides, each one keeping a different pastel secret from the sun.',
  placeholder: {
    color: '#a9a3a3',
    shading: 'smooth',
  },
} as const satisfies KnotData
