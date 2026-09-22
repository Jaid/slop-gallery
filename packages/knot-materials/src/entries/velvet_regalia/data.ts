import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_regalia',
  candidateId: 'mimo',
  title: 'Velvet Regalia',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Wine-dark pile drinks the light whole, then breathes it back as gold thread and a regal hush.',
  displacement: 0.005,
  placeholder: {
    color: '#4d0b1b',
    shading: 'fabric',
  },
} as const satisfies KnotData
