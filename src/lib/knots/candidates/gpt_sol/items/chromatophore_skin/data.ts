import type {KnotData} from '../../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'chromatophore_skin',
  title: 'Chromatophore Skin',
  harness: 'none',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
      slug: 'openai/gpt-5.6-sol',
      effortLevel: 'max',
    },
  },
  accent: '#28dfc1',
  displacement: 0.014,
  highlighted: false,
} as const satisfies KnotData
