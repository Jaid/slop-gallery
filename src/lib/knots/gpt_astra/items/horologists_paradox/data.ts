import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'horologists_paradox',
  title: "Horologist's Paradox",
  harness: 'none',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  accent: '#d9b16b',
  highlighted: true,
} as const satisfies KnotData
