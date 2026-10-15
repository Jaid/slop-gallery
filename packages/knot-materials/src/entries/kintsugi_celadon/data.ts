import type {KnotData} from '../../types.ts'

// Mage run: K45USvVjintSE0u; fixture: knot-material-shaders; result: success.
export default {
  id: 'kintsugi_celadon',
  candidateId: 'gemini_argon',
  title: 'Kintsugi Celadon',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.014,
  flavorText: 'Song-dynasty celadon porcelain crazed with ice-crackle veins and mended in molten 24-karat gold. Step closer and the kiln’s amber spirit stirs along the seams.',
  placeholder: {
    color: '#65736c',
    shading: 'smooth',
  },
} as const satisfies KnotData
