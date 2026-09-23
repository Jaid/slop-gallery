import type {KnotData} from '../../types.ts'

export default {
  id: 'bismuth_wells',
  candidateId: 'gemini_flash',
  title: 'Bismuth Wells',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Terraced staircase pyramids step inward toward molten hollows, washed in vibrant oxidation bands.',
  displacement: 0.011,
  placeholder: {
    color: '#a78bd6',
    shading: 'metal',
  },
} as const satisfies KnotData
