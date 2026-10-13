import type {KnotData} from '../../types.ts'

// Mage run: Cp16WUQoUlMTqRD; fixture: knot-material-shaders; result: success.
export default {
  id: 'murano_breath',
  candidateId: 'muse_wonder',
  title: 'Murano Breath',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The glassblower’s last breath still turns inside the glass, amber and lagoon, refusing ever to cool.',
  placeholder: {
    color: '#868674',
    shading: 'glass',
  },
} as const satisfies KnotData
