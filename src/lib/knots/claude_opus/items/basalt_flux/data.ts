import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'basalt_flux',
  title: "Basalt Flux",
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  accent: '#ff3b08',
  displacement: 0.015,
  highlighted: false,
} as const satisfies KnotData
