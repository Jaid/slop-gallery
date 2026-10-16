import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'jade_cloisonne',
  candidateId: 'gemini_argon',
  title: 'Jade Cloisonné',
  createdAt: 1792017078,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.009,
  flavorText: 'Bent brass cloisons hold pools of cobalt and imperial jade vitreous enamel over engine-turned silver leaf, glittering with aventurine and gilt rims.',
  placeholder: {
    color: '#79887f',
    shading: 'glass',
  },
} as const satisfies KnotData
