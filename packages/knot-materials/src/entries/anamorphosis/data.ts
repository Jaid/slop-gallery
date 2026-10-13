import type {KnotData} from '../../types.ts'

// Mage run: MgSdUInR50wESrr; fixture: knot-material-shaders; result: success.
export default {
  id: 'anamorphosis',
  candidateId: 'muse_wonder',
  title: 'Anamorphosis',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  flavorText: 'Two pictures share one ribbed skin. Walk, and silver moons dissolve into an ember lattice; stand still, and neither will confess.',
  placeholder: {
    color: '#9baeb4',
    shading: 'metal',
  },
} as const satisfies KnotData
