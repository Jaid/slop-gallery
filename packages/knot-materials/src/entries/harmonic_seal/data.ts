import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'harmonic_seal',
  candidateId: 'gpt_astra',
  title: 'Harmonic Seal',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A seal from a civilization that stored its music in light. Tilt the silence and its impossible harmonics return.',
  placeholder: {
    color: '#b0a1bc',
    shading: 'metal',
  },
} as const satisfies KnotData
