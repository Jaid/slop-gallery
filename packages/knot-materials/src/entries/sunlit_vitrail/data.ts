import type {KnotData} from '../../types.ts'

// Mage run: MDsU2CH3XEff3jd; fixture: knot-material-shaders; result: success.
export default {
  id: 'sunlit_vitrail',
  candidateId: 'space_bunny',
  title: 'Sunlit Vitrail',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.0025,
  flavorText: 'A thousand panes of coloured glass, leaded into a knot, and one slow sun walking across all of it.',
  placeholder: {
    color: '#595089',
    shading: 'glass',
  },
} as const satisfies KnotData
