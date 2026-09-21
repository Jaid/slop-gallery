import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'suminagashi',
  candidateId: 'deepseek',
  title: 'Suminagashi',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Ink was dropped on still water, and the water was asked to remember it.',
  placeholder: {
    color: '#d8d3c8',
    shading: 'smooth',
  },
} as const satisfies KnotData
