import type {KnotData} from '../../types.ts'

// Mage run: MDsU2CH3XEff3jd; fixture: knot-material-shaders; result: success.
export default {
  id: 'blue_ice',
  candidateId: 'space_bunny',
  title: 'Blue Ice',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.004,
  flavorText: 'Nine hundred years of snow, compressed until the air itself was forced into the glass and stayed there.',
  placeholder: {
    color: '#27567a',
    shading: 'glass',
  },
} as const satisfies KnotData
