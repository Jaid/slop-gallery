import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vitrail',
  candidateId: 'mimo',
  title: 'Vitrail',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A cathedral window poured through a knot; its jeweled panes still burn with the last of the sunset.',
  displacement: 0.005,
  placeholder: {
    color: '#7442a8',
    shading: 'glass',
  },
} as const satisfies KnotData
