import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'umbra_choir',
  candidateId: 'gpt_sol',
  title: 'Umbra Choir',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A procession of tiny eclipses rings the stone; only at the edge of sight does their buried corona begin to sing.',
  placeholder: {
    color: '#323431',
    shading: 'stone',
  },
} as const satisfies KnotData
