import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'obsidian_kintsugi',
  candidateId: 'gemini_flash',
  title: 'Obsidian Kintsugi',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 3.8 Flash',
      slug: 'google/gemini-3.8-flash',
      effortLevel: 'high',
    },
  },
  flavorText: 'Fractured volcanic glass finds peace where molten seams of sacred gold mend every forgotten wound.',
  placeholder: {
    color: '#181211',
    shading: 'glass',
  },
} as const satisfies KnotData
