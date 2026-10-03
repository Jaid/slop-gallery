import type {KnotData} from '../../types.ts'

// Mage run: 5RXWnszENQQH6u3; fixture: knot-material-shaders; result: success.
export default {
  id: 'nightjar',
  candidateId: 'space_bunny',
  title: 'Nightjar',
  harness: 'Mage',
  author: {
    model: {
      title: 'Space Bunny Alpha',
      slug: 'stealth/space-bunny-alpha',
      effortLevel: 'max',
    },
  },
  flavorText: 'A bird that hunts by sound grew wings from a material older than feathers, then wore them down to a whisper.',
  placeholder: {
    color: '#6f6a5e',
    shading: 'fabric',
  },
} as const satisfies KnotData
