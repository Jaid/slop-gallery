import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'sidereal_orrery',
  candidateId: 'gpt_astra',
  title: 'Sidereal Orrery',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  flavorText: 'Tiny heavens turn beneath the watchmaker’s glass. Their hands measure not the hours, but the time you choose to linger.',
  placeholder: {
    color: '#a4834f',
    shading: 'metal',
  },
} as const satisfies KnotData
