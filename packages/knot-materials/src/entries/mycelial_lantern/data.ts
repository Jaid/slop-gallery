import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'mycelial_lantern',
  candidateId: 'gpt_sol',
  title: 'Mycelial Lantern',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A web of living filaments shares one gentle light among many paths.',
  placeholder: {
    color: '#c4ff68',
    shading: 'fabric',
  },
} as const satisfies KnotData
