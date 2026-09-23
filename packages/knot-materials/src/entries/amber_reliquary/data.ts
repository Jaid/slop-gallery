import type {KnotData} from '../../types.ts'

export default {
  id: 'amber_reliquary',
  candidateId: 'mimo',
  title: 'Amber Reliquary',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Forty million years of sunlight, bottled. A fern, a midge, a held breath – all of it still waiting for the dawn.',
  placeholder: {
    color: '#c27b2b',
    shading: 'glass',
  },
} as const satisfies KnotData
