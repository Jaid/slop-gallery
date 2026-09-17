import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'plasma_cell',
  candidateId: 'hy',
  title: 'Plasma Cell',
  harness: 'none',
  author: {
    model: {
      title: 'Hy4 Preview',
      slug: 'tencent/hy4-preview',
      effortLevel: 'medium',
    },
  },
  flavorText: 'A charged glow presses against the walls of its fragile chamber.',
  placeholder: {
    color: '#dff6ff',
    shading: 'liquid',
  },
} as const satisfies KnotData
