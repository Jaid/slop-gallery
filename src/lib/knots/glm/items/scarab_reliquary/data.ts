import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('./icon.jxl', import.meta.url).href,
  id: 'scarab_reliquary',
  number: 35,
  title: 'Scarab Reliquary',
  author: {
    model: {
      title: 'GLM 5.3'
    }
  },
  accent: '#ffd76a',
  highlighted: false,
  archived: true
} as const satisfies KnotData
