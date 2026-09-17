import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'scarab_reliquary',
  candidateId: 'glm',
  title: 'Scarab Reliquary',
  author: {
    model: {
      title: 'GLM 5.3',
    },
  },
  flavorText: "A beetle's shifting colors have been kept like fragments of a lost crown.",
  placeholder: {
    color: '#ffd76a',
    shading: 'smooth',
  },
} as const satisfies KnotData
