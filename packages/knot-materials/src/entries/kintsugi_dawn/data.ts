import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_dawn',
  candidateId: 'glm',
  title: 'Kintsugi Dawn',
  harness: 'none',
  author: {
    model: {
      title: 'GLM 5.3',
      slug: 'z-ai/glm-5.3',
      effortLevel: 'max',
    },
  },
  flavorText: 'The first light enters through the places that once broke.',
  placeholder: {
    color: '#f2c14e',
    shading: 'stone',
  },
} as const satisfies KnotData
