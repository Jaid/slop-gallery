import type {KnotData} from '../../types.ts'

// Mage run: 2E09QDOVGvyWUoU; fixture: knot-material-shaders; result: success.
export default {
  id: 'raku_celadon',
  candidateId: 'gemini_argon',
  title: 'Raku Celadon',
  harness: 'Mage',
  author: {
    model: {
      title: 'Gemini 4 Argon',
      slug: 'google/gemini-4-argon',
      effortLevel: 'medium',
    },
  },
  displacement: 0.011,
  flavorText: 'Thick jade celadon pools over charred stoneware, crazed with golden kintsugi seams. As you walk past, kiln iridescence blooms along the cracks.',
  placeholder: {
    color: '#708077',
    shading: 'smooth',
  },
} as const satisfies KnotData
