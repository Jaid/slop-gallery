import type {KnotData} from '../../types.ts'

export default {
  id: 'tesseract_projection',
  candidateId: 'qwen_max',
  title: 'Tesseract Projection',
  harness: 'chat.qwen.ai',
  author: {
    model: {
      title: 'Qwen 3.8 Max',
    },
  },
  flavorText: 'An impossible solid casts a succession of almost-familiar shadows.',
  placeholder: {
    color: '#00ffcc',
    shading: 'ghost',
  },
} as const satisfies KnotData
