import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'amber_menagerie',
  candidateId: 'claude_opus',
  title: 'Amber Menagerie',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Time sealed a miniature wilderness inside the resin, but neglected to tell it that it was dead.',
  placeholder: {
    color: '#b06a1b',
    shading: 'glass',
  },
} as const satisfies KnotData
