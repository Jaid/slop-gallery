import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mercury_tremor',
  candidateId: 'mimo',
  title: 'Mercury Tremor',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.5 Pro',
      slug: 'xiaomi/mimo-v2.5-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A metal that never set. It trembles at your breath and keeps a perfect, upside-down portrait of the room.',
  displacement: 0.12,
  placeholder: {
    color: '#b8bec4',
    shading: 'liquid',
  },
} as const satisfies KnotData
