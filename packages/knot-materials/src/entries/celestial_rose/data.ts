import type {KnotData} from '../../types.ts'

export default {
  id: 'celestial_rose',
  candidateId: 'gpt_sol',
  title: 'Celestial Rose',
  author: {
    model: {
      title: 'GPT-5.6 Sol',
    },
  },
  flavorText: 'Petals of distant light turn toward an unseen dawn.',
  placeholder: {
    color: '#fff0b5',
    shading: 'smooth',
  },
} as const satisfies KnotData
