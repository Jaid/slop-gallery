import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'kintsugi_obsidian',
  candidateId: 'claude_fable',
  title: 'Kintsugi Obsidian',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Fable 5.1',
      slug: 'anthropic/claude-fable-5.1',
      effortLevel: 'max',
    },
  },
  flavorText: 'Gold traces a careful apology across the broken black glass.',
  placeholder: {
    color: '#ffd77a',
    shading: 'stone',
  },
} as const satisfies KnotData
