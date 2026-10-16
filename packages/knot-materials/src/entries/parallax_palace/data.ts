import type {KnotData} from '../../types.ts'

// Mage run: 0CPX47Y7FuE0PTN.
export default {
  id: 'parallax_palace',
  candidateId: 'gpt_sol',
  title: 'Parallax Palace',
  createdAt: 1_790_311_863,
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Sol',
      slug: 'openai/gpt-6-sol',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'A thousand optical shutters conceal another geometry. Walk around it and the architecture turns to shifting stained light.',
  placeholder: {
    color: '#342858',
    shading: 'metal',
  },
} as const satisfies KnotData
