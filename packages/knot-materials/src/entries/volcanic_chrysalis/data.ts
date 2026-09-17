import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'volcanic_chrysalis',
  candidateId: 'gemini_flash',
  title: 'Magma Chrysalis',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'A cracked volcanic shell waits for the bright creature forming beneath it.',
  placeholder: {
    color: '#ff4d17',
    shading: 'smooth',
  },
  displacement: 0.018,
} as const satisfies KnotData
