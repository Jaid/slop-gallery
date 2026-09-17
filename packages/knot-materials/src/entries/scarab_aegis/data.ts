import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'scarab_aegis',
  candidateId: 'gemini_flash',
  title: 'Scarab Aegis',
  harness: 'none',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Layered jewel armor guards a secret small enough to fit beneath a wing.',
  placeholder: {
    color: '#10b981',
    shading: 'smooth',
  },
  archived: true,
} as const satisfies KnotData
