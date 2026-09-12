import type {KnotData} from '../../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'tesseract_projection',
  number: 184,
  title: 'Tesseract Projection',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  accent: '#00ffcc',
  highlighted: false,
} as const satisfies KnotData
