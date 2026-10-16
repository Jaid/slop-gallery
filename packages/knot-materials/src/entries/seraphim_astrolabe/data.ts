import type {KnotData} from '../../types.ts'

// Mage run: K45USvVjintSE0u; fixture: knot-material-shaders; result: success.
export default {
  id: 'seraphim_astrolabe',
  candidateId: 'gemini_argon',
  title: 'Seraphim Astrolabe',
  createdAt: 1792050794,
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.017,
  flavorText: 'Celestial brass rings and engine-turned guilloche turn around an abyssal aventurine dial. Step closer and its tourbillon escapements awaken with ruby fire.',
  placeholder: {
    color: '#4b4140',
    shading: 'metal',
  },
} as const satisfies KnotData
