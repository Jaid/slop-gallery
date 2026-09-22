import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'vesper_rose',
  candidateId: 'mimo',
  title: 'Vesper Rose',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Color and patient fire, caged in lead and bent into a loop. Walk past, and the vespers follow you through the panes.',
  placeholder: {
    color: '#756477',
    shading: 'glass',
  },
} as const satisfies KnotData
