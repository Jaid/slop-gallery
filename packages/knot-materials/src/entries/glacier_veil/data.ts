import type {KnotData} from '../../types.ts'

export default {
  id: 'glacier_veil',
  candidateId: 'mimo',
  title: 'Glacier Veil',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Glacier light remembers the sky. Curtains of a younger sun drift beneath the ice and slide whenever you do.',
  placeholder: {
    color: '#317e86',
    shading: 'glass',
  },
} as const satisfies KnotData
