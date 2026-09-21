import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_relic',
  candidateId: 'gemini_flash',
  title: 'Kintsugi Relic',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Imperial celadon porcelain bears its ancient fractures with pride, mended forever in thick veins of celestial gold.',
  displacement: 0.014,
  placeholder: {
    color: '#a6b29a',
    shading: 'smooth',
  },
} as const satisfies KnotData
