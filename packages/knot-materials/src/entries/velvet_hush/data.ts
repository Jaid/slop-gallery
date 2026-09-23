import type {KnotData} from '../../types.ts'

export default {
  id: 'velvet_hush',
  candidateId: 'mimo',
  title: 'Velvet Hush',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Wine-dark pile that swallows the light head-on and burns at the edges when you pass. The damask answers only to the grazing eye.',
  placeholder: {
    color: '#581326',
    shading: 'fabric',
  },
} as const satisfies KnotData
