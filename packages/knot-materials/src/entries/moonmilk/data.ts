import type {KnotData} from '../../types.ts'

export default {
  id: 'moonmilk',
  candidateId: 'mimo',
  title: 'Moonmilk',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Layers of shell remember the moon, and hand its borrowed light back to you in slow tides of pearl.',
  placeholder: {
    color: '#e5d9c6',
    shading: 'smooth',
  },
} as const satisfies KnotData
