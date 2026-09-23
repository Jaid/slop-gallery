import type {KnotData} from '../../types.ts'

export default {
  id: 'gilded_scars',
  candidateId: 'mimo',
  title: 'Gilded Scars',
  harness: 'Mage',
  author: {
    model: {
      title: 'MiMo V2.6 Pro',
      slug: 'xiaomi/mimo-v2.6-pro',
      effortLevel: 'xhigh',
    },
  },
  flavorText: 'Porcelain taught itself to break, and gold taught it to sing again. The seams shine where the light gets out.',
  placeholder: {
    color: '#8fae9a',
    shading: 'smooth',
  },
} as const satisfies KnotData
