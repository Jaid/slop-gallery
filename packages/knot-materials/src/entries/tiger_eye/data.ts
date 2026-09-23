import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tiger_eye',
  candidateId: 'mimo',
  title: 'Tiger’s Eye',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Silk turned to stone, and one band of light that will not be caught – it slips away as you circle the knot.',
  placeholder: {
    color: '#c07a20',
    shading: 'stone',
  },
} as const satisfies KnotData
