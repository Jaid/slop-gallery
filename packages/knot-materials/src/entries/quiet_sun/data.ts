import type {KnotData} from '../../types.ts'

export default {
  icon: new URL('icon.jxl', import.meta.url).href,
  id: 'quiet_sun',
  candidateId: 'grok',
  title: 'Quiet Sun',
  harness: 'Mage',
  author: {
    model: {
      title: 'Grok 4.7',
      slug: 'x-ai/grok-4.7',
      effortLevel: 'xhigh',
    },
  },
  displacement: 0.019,
  flavorText: 'A courteous star, small enough to walk around. Granules boil across its face, and the limb cools to ember wherever the gaze grows shallow.',
  placeholder: {
    color: '#a11c0c',
    shading: 'smooth',
  },
} as const satisfies KnotData
