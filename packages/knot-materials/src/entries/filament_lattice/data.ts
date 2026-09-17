import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'filament_lattice',
  candidateId: 'claude_opus',
  title: 'Filament Lattice',
  harness: 'none',
  author: {
    model: {
      title: 'Claude Opus 5',
      slug: 'anthropic/claude-opus-5',
      effortLevel: 'medium',
    },
  },
  flavorText: 'Fine strands hold an intricate agreement between light and empty space.',
  placeholder: {
    color: '#ffae3b',
    shading: 'glass',
  },
} as const satisfies KnotData
