import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'solar_fire_opal',
  candidateId: 'gemini_flash',
  title: 'Solar Fire Opal',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Trapped within dark volcanic glass, a hidden cosmos of iridescent fire awakens whenever the viewer turns.',
  placeholder: {
    color: '#c94f24',
    shading: 'glass',
  },
} as const satisfies KnotData
