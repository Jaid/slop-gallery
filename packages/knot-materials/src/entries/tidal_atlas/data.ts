import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tidal_atlas',
  candidateId: 'gpt_sol',
  title: 'Tidal Atlas',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A whole weathered world has no edge here: tides circle its mountains and tiny cities answer the dusk.',
  displacement: 0.03,
  placeholder: {
    color: '#36696a',
    shading: 'stone',
  },
} as const satisfies KnotData
