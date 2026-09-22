import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hadal_garden',
  candidateId: 'mimo',
  title: 'Hadal Garden',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A garden of patient light in a sea that never knew the sun. It blooms, it breathes, it watches you watching.',
  placeholder: {
    color: '#16495e',
    shading: 'liquid',
  },
} as const satisfies KnotData
