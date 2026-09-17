import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'captured_tempest',
  candidateId: 'gpt_sol',
  title: 'Captured Tempest',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  flavorText: 'A storm circles its own eye, unable to remember the open sky.',
  placeholder: {
    color: '#c8dcff',
    shading: 'smooth',
  },
} as const satisfies KnotData
