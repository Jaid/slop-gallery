import type {KnotData} from '../../types.ts'

export default {
  id: 'parquet_reverie',
  candidateId: 'gpt_astra',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'max',
    },
  },
  title: 'Parquet Reverie',
  flavorText: 'A cabinetmaker tiled a daydream with maple and rosewood, then misplaced every straight line.',
  placeholder: {
    color: '#b67b43',
    shading: 'smooth',
  },
  icon: new URL('icon.jxl', import.meta.url).href,
} as const satisfies KnotData
