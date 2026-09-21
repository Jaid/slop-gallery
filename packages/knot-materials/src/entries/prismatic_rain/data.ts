import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'prismatic_rain',
  candidateId: 'gpt_luna',
  title: 'Prismatic Rain',
  harness: 'Mage',
  author: {
    model: {
      title: 'GPT-5.6 Luna',
      slug: 'openai/gpt-5.6-luna',
      effortLevel: 'max',
    },
  },
  flavorText: 'A storm is held in clear glass: droplets catch the gallery, split it into rainbows and drift through one another.',
  displacement: 0.002,
  placeholder: {
    color: '#334c6f',
    shading: 'glass',
  },
} as const satisfies KnotData
