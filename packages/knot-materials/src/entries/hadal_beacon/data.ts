import type {KnotData} from '../../types.ts'

// Mage run: MgSdUInR50wESrr; fixture: knot-material-shaders; result: success.
export default {
  id: 'hadal_beacon',
  candidateId: 'muse_wonder',
  title: 'Hadal Beacon',
  createdAt: 1791858712,
  harness: 'Mage',
  author: {
    model: {
      title: 'Muse Wonder 1.0',
      slug: 'meta/muse-wonder-1.0',
      effortLevel: 'max',
    },
  },
  displacement: 0.006,
  flavorText: 'Below the last sunlight, a patient animal wears its stars inside translucent skin, and each light answers the next in a slow, travelling pulse.',
  placeholder: {
    color: '#02233b',
    shading: 'glass',
  },
} as const satisfies KnotData
