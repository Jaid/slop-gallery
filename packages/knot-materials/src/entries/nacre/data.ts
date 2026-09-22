import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'nacre',
  candidateId: 'mimo',
  title: 'Nacre',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'The shell keeps a rainbow it never earned – a thousand thin years of moonlight folded into one skin.',
  placeholder: {
    color: '#d0c7cc',
    shading: 'glass',
  },
} as const satisfies KnotData
