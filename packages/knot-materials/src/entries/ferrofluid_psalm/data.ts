import type {KnotData} from '../../types.ts'

// Mage run: KsUDOPCUWqzzKMp; fixture: knot-material-shaders; result: success.
export default {
  id: 'ferrofluid_psalm',
  candidateId: 'muse_wonder',
  title: 'Ferrofluid Psalm',
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  displacement: 0.1,
  flavorText: 'A black tide of liquid iron lifts its spines toward you, answering a magnet only your presence can hold.',
  placeholder: {
    color: '#161618',
    shading: 'metal',
  },
} as const satisfies KnotData
