import type {KnotData} from '../../types.ts'

export default {
  id: 'blue_hour',
  candidateId: 'mimo',
  title: 'Blue Hour',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Porcelain painted with the last blue of evening and sealed under a glaze of quiet glass.',
  placeholder: {
    color: '#2040a0',
    shading: 'stone',
  },
} as const satisfies KnotData
