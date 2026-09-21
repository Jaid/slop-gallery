import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'black_opal',
  candidateId: 'gemini_flash',
  title: 'Black Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Trapped inside dark ironstone, microscopic silica spheres ignite into blinding flashes of spectral fire as you turn.',
  placeholder: {
    color: '#161c24',
    shading: 'glass',
  },
} as const satisfies KnotData
