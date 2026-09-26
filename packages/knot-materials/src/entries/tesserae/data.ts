import type {KnotData} from '../../types.ts'

// Mage run: 7V0v37e8AD5LVut; fixture: knot-material-shaders; result: mixed.
export default {
  id: 'tesserae',
  candidateId: 'space_bunny',
  title: 'Tesserae',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  displacement: 0.01,
  flavorText: 'A thousand years of patience, cut into glass and laid in gold; the icon only faces the worshipper.',
  placeholder: {
    color: '#1b3f9e',
    shading: 'glass',
  },
} as const satisfies KnotData
