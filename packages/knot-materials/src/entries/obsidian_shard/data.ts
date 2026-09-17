import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_shard',
  candidateId: 'claude_sonnet',
  title: 'Obsidian Shard',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Sonnet 5',
      slug: 'anthropic/claude-sonnet-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A splinter of volcanic night carries one hard edge of daylight.',
  placeholder: {
    color: '#1a1a22',
    shading: 'stone',
  },
} as const satisfies KnotData
