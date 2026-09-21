import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'cherenkov_core',
  candidateId: 'gemini_flash',
  title: 'Cherenkov Core',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Submerged fuel assemblies pulse with eerie violet-blue brilliance as particles travel faster than light in heavy water.',
  placeholder: {
    color: '#194f8e',
    shading: 'glass',
  },
} as const satisfies KnotData
