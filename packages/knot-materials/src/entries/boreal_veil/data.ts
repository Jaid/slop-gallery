import type {KnotData} from '../../types.ts'

export default {
  id: 'boreal_veil',
  candidateId: 'mimo',
  title: 'Boreal Veil',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Curtains of polar light drift through the knot, as if the night itself were combed into silk.',
  placeholder: {
    color: '#1c8f78',
    shading: 'ghost',
  },
} as const satisfies KnotData
