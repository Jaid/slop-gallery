import type {KnotData} from '../../types.ts'

export default {
  id: 'frozen_fire',
  candidateId: 'mimo',
  title: 'Frozen Fire',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'An opal dreams in patches of fire; every step you take rewrites the spectrum it has kept for a million years.',
  placeholder: {
    color: '#565a68',
    shading: 'glass',
  },
} as const satisfies KnotData
