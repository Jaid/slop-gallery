import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'asteria',
  candidateId: 'mimo',
  title: 'Asteria',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A small star is caught in the stone. Walk, and it walks with you, forever at the edge of your eye.',
  displacement: 0.001,
  placeholder: {
    color: '#3556a8',
    shading: 'glass',
  },
} as const satisfies KnotData
