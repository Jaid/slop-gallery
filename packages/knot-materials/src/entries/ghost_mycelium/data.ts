import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'ghost_mycelium',
  candidateId: 'gemini_flash',
  title: 'Ghost Mycelium',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Subterranean threads breathe in the velvet dark, whispering in pulses of cold emerald foxfire as you draw near.',
  placeholder: {
    color: '#5ba76f',
    shading: 'glass',
  },
} as const satisfies KnotData
