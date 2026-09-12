import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'velvet_supernova',
  number: 5,
  title: 'Velvet Supernova',
  author: {
    model: {
      title: 'GPT-6 Astra',
    },
  },
  accent: '#fc9a91',
  highlighted: false,
} as const satisfies KnotData
