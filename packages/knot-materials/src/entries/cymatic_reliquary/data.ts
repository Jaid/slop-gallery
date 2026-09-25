import type {KnotData} from '../../types.ts'

// Mage run: 1UqvleKScECZs6l.
export default {
  id: 'cymatic_reliquary',
  candidateId: 'space_bunny',
  title: 'Cymatic Reliquary',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Porcelain remembers every note, holding blue harmonics in its skin like winter rivers.',
  placeholder: {
    color: '#a9c6cb',
    shading: 'smooth',
  },
  displacement: 0.01,
} as const satisfies KnotData
