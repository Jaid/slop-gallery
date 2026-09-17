import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'clockwork_oracle',
  candidateId: 'deepseek',
  title: 'Clockwork Oracle',
  harness: 'chat.deepseek.com',
  author: {
    model: {
      title: 'DeepSeek',
      effortLevel: 'DeepThink',
    },
  },
  flavorText: 'A machine of tiny certainties attempts to predict an impossible future.',
  placeholder: {
    color: '#ffcc44',
    shading: 'metal',
  },
} as const satisfies KnotData
