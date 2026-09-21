import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'sumi_tide',
  candidateId: 'claude_opus',
  title: 'Sumi Tide',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'The brush has vanished, yet its final gesture continues to wander through the paper.',
  displacement: 0.003,
  placeholder: {
    color: '#d0c8b8',
    shading: 'smooth',
  },
} as const satisfies KnotData
