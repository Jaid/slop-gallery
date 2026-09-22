import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'gilded_mercury',
  candidateId: 'mimo',
  title: 'Gilded Mercury',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A metal that refuses to hold still. Every step you take rearranges the whole room inside its skin.',
  placeholder: {
    color: '#a0a5a8',
    shading: 'liquid',
  },
} as const satisfies KnotData
