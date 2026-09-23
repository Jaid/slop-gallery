import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_rose',
  candidateId: 'mimo',
  title: 'Velvet Rose',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.022,
  flavorText: 'A rose that never wilts, wearing the last of the garden’s dew in the dark folds of its velvet.',
  placeholder: {
    color: '#c02038',
    shading: 'fabric',
  },
} as const satisfies KnotData
