import type {KnotData} from '../../types.ts'

// Mage run: DwSASUlaGpPBz8y; fixture: knot-material-br11k.
export default {
  id: 'aster_gaze',
  candidateId: 'gpt_astra',
  title: 'Aster Gaze',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-6 Astra',
      slug: 'openai/gpt-6-astra',
      effortLevel: 'high',
    },
  },
  flavorText: 'Before the stars had names, they had whiskers. Come closer: the little hunters of the night are learning the shape of your gaze.',
  placeholder: {
    color: '#0e0516',
    shading: 'metal',
  },
} as const satisfies KnotData
