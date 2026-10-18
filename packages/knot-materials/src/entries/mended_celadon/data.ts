import type {KnotData} from '../../types.ts'

// Mage run: 7mkaA7JC9cNnoS2; fixture: knot-material-shaders; result: success.
export default {
  id: 'mended_celadon',
  candidateId: 'deepseek',
  title: 'Mended Celadon',
  createdAt: 1_792_264_877,
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: 'It was broken, and the breaking was kept. Gold remembers every fracture the way light remembers a window.',
  placeholder: {
    color: '#8a9c8f',
    shading: 'stone',
  },
} as const satisfies KnotData
