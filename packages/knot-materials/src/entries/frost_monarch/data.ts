import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'frost_monarch',
  candidateId: 'gemini_flash',
  title: 'Frost Monarch',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Primeval glacial ice cradles dendritic hoarfrost crystals and ancient diamond air bubbles frozen in perpetual stillness.',
  placeholder: {
    color: '#8fc8df',
    shading: 'glass',
  },
} as const satisfies KnotData
