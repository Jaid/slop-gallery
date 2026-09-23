import type {KnotData} from '../../types.ts'

export default {
  id: 'chromatophore_skin',
  candidateId: 'gpt_sol',
  title: 'Chromatophore Skin',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'Patterns surface and retreat like thoughts beneath a living hide.',
  placeholder: {
    color: '#28dfc1',
    shading: 'smooth',
  },
  displacement: 0.014,
} as const satisfies KnotData
