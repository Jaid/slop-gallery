import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'helios_forge',
  candidateId: 'deepseek',
  title: 'Helios Forge',
  harness: 'none',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'max',
    },
  },
  flavorText: "The sun's workshop leaves bright filings along every curve.",
  placeholder: {
    color: '#ffb347',
    shading: 'smooth',
  },
} as const satisfies KnotData
