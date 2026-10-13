import type {KnotData} from '../../types.ts'

// Mage run: Am1BnNRHvHbHCa2; fixture: knot-material-shaders; result: success.
export default {
  id: 'glacier_testament',
  candidateId: 'muse_wonder',
  title: 'Glacier Testament',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  displacement: 0.01,
  flavorText: 'Ancient snow remembers every winter as a bright fracture sealed in blue glass — lean close and listen for the trapped bubbles.',
  placeholder: {
    color: '#8ab5d6',
    shading: 'glass',
  },
} as const satisfies KnotData
