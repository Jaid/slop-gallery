import type {KnotData} from '../../types.ts'

export default {
  id: 'deep_field',
  candidateId: 'mimo',
  title: 'Deep Field',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A window cut into the deep field: ten thousand suns behind the glass, sliding past one another as you walk.',
  placeholder: {
    color: '#070d1a',
    shading: 'glass',
  },
} as const satisfies KnotData
