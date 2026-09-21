import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'photinus_synchrony',
  candidateId: 'claude_opus',
  title: 'Photinus Synchrony',
  harness: 'Mage',
  author: {
    model: {
      title: 'Claude Opus 4.6 Thinking',
      slug: 'anthropic/claude-opus-4-6-thinking',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A swarm of fireflies has chosen the knot as their midnight forest, pulsing toward a single breath.',
  displacement: 0.006,
  placeholder: {
    color: '#35562f',
    shading: 'stone',
  },
} as const satisfies KnotData
