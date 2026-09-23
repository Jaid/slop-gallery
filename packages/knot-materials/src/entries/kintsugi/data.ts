import type {KnotData} from '../../types.ts'

export default {
  id: 'kintsugi',
  candidateId: 'mimo',
  title: 'Kintsugi',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Shattered on purpose, mended with gold. The seam is not a scar but a river of light through the dark clay.',
  placeholder: {
    color: '#1c1610',
    shading: 'stone',
  },
} as const satisfies KnotData
