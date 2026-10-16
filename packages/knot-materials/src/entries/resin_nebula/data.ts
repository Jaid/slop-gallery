import type {KnotData} from '../../types.ts'

// Mage run: EC58pRKjMMMNqsv; fixture: knot-material-shaders; result: success.
export default {
  id: 'resin_nebula',
  candidateId: 'muse_wonder',
  title: 'Resin Nebula',
  createdAt: 1791844628,
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A nebula folded into clear resin; lean closer and its star clouds drift past one another, refusing to sit still.',
  placeholder: {
    color: '#595678',
    shading: 'glass',
  },
} as const satisfies KnotData
