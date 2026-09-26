import type {KnotData} from '../../types.ts'

// Mage run: K0nU326lufLQTl2; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'desert_tiger_eye',
  candidateId: 'space_bunny',
  title: 'Desert Tiger Eye',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A cat keeps one eye open in the desert. Move and the eye slides along the stone, always exactly where the light is.',
  placeholder: {
    color: '#b57a1c',
    shading: 'stone',
  },
} as const satisfies KnotData
