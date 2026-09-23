import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'orrery_of_hours',
  candidateId: 'deepseek',
  title: 'Orrery of Hours',
  harness: 'Mage',
  author: {
    model: {
      title: 'DeepSeek 4.1 Flash',
      slug: 'deepseek/deepseek-4.1-flash',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.009,
  flavorText: 'A brass movement with no dial to read: only wheels that keep counting something the room cannot name.',
  placeholder: {
    color: '#c99a34',
    shading: 'metal',
  },
} as const satisfies KnotData
