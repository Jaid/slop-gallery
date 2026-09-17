import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'hadal_lantern',
  candidateId: 'claude_fable',
  title: 'Abyssal Lantern',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'A cold lamp glows for travelers who have never known the surface.',
  placeholder: {
    color: '#4de3ff',
    shading: 'glass',
  },
  archived: true,
} as const satisfies KnotData
