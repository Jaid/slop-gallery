import type {KnotData} from '../../types.ts'

export default {
  id: 'kintsugi_faults',
  candidateId: 'mimo',
  title: 'Kintsugi Faults',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Where the vessel broke, gold remembers the shape of the wound and makes it the brightest seam.',
  displacement: 0.006,
  placeholder: {
    color: '#a8b8a1',
    shading: 'smooth',
  },
} as const satisfies KnotData
