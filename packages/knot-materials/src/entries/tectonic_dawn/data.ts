import type {KnotData} from '../../types.ts'

// Mage run: 2kVLNNiT7YsY7gP.
export default {
  id: 'tectonic_dawn',
  candidateId: 'space_bunny',
  title: 'Tectonic Dawn',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'Before the first light, the planet opens a seam and lets the hidden sun escape.',
  placeholder: {
    color: '#172a3a',
    shading: 'stone',
  },
} as const satisfies KnotData
