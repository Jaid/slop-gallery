import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hadal_bioluminescence',
  candidateId: 'gemini_flash',
  title: 'Hadal Combglow',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Deep in the oceanic abyss, undulating ciliated combs disperse running rainbow light while living photophores whisper in the cold.',
  placeholder: {
    color: '#184b5e',
    shading: 'glass',
  },
} as const satisfies KnotData
