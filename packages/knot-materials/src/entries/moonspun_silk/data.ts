import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'moonspun_silk',
  candidateId: 'mimo',
  title: 'Moonspun Silk',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Cloth woven from moth-wing and moonlight; the luster rolls across it like a slow silver tide.',
  placeholder: {
    color: '#6e688c',
    shading: 'fabric',
  },
} as const satisfies KnotData
