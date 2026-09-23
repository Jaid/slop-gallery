import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'abyssal_bloom',
  candidateId: 'mimo',
  title: 'Abyssal Bloom',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.01,
  flavorText: 'Something ancient blooms in the dark, its nerves lit with cold fire, feeling its way along the endless knot.',
  placeholder: {
    color: '#0a1c2c',
    shading: 'glass',
  },
} as const satisfies KnotData
