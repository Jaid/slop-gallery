import type {KnotData} from '../../types.ts'

export default {
  id: 'bismuth_geode',
  candidateId: 'gemini_flash',
  title: 'Bismuth Geode',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Square staircases descend into iridescent metallic terraces, carved by the patient geometry of crystal growth.',
  placeholder: {
    color: '#9b78c6',
    shading: 'metal',
  },
} as const satisfies KnotData
