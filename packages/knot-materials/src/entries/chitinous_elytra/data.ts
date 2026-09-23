import type {KnotData} from '../../types.ts'

export default {
  id: 'chitinous_elytra',
  candidateId: 'gemini_flash',
  title: 'Chitinous Elytra',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Corrugated jewel-beetle armor splits the daylight into iridescent sheens of peacock green and gold.',
  displacement: 0.007,
  placeholder: {
    color: '#53753c',
    shading: 'smooth',
  },
} as const satisfies KnotData
