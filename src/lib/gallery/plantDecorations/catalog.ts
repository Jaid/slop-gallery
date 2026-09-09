import type {Vec3} from '../types.ts'

export const pots = [
  {
    id: 'atelier',
    title: 'Atelier clay',
    subtitle: 'Thrown terracotta',
    soilHeight: 0.57,
    soilRadius: 0.306,
    height: 0.67,
    radius: 0.37,
  },
  {
    id: 'ivory',
    title: 'Ivory flute',
    subtitle: 'Carved porcelain',
    soilHeight: 0.68,
    soilRadius: 0.291,
    height: 0.76,
    radius: 0.342,
  },
  {
    id: 'celadon',
    title: 'Celadon pebble',
    subtitle: 'Satin green glaze',
    soilHeight: 0.43,
    soilRadius: 0.323,
    height: 0.51,
    radius: 0.4,
  },
  {
    id: 'noir',
    title: 'Noir / brass',
    subtitle: 'Charcoal & brushed brass',
    soilHeight: 0.72,
    soilRadius: 0.285,
    height: 0.8,
    radius: 0.335,
  },
] as const
export type PotKind = (typeof pots)[number]['id']

export const plants = [
  {
    id: 'philodendron',
    title: 'Split-leaf philodendron',
    subtitle: 'Sculptural, deeply cut foliage',
  },
  {
    id: 'fig',
    title: 'Fiddle-leaf fig',
    subtitle: 'Airy branching canopy',
  },
  {
    id: 'palm',
    title: 'Kentia palm',
    subtitle: 'Feathery arching fronds',
  },
  {
    id: 'snake',
    title: 'Golden snake plant',
    subtitle: 'Upright, gold-edged blades',
  },
  {
    id: 'rubber',
    title: 'Burgundy rubber plant',
    subtitle: 'Glossy oxblood foliage',
  },
  {
    id: 'calathea',
    title: 'Calathea orbifolia',
    subtitle: 'Silver-striped round leaves',
  },
  {
    id: 'fern',
    title: 'Boston fern',
    subtitle: 'A soft fountain of green',
  },
  {
    id: 'jade',
    title: 'Jade bonsai',
    subtitle: 'Sculpted trunk & succulent leaves',
  },
] as const
export type PlantKind = (typeof plants)[number]['id']

// Pot-major ordering stays stable when the temporary display is removed.
export const plantCombinations = pots.flatMap((pot, row) => plants.map((plant, column) => ({
  number: row * plants.length + column + 1,
  pot: pot.id,
  plant: plant.id,
  position: [(column - 3.5) * 1.65, 0, 3.1 - row * 2.7] as Vec3,
})))

export function potDefinition(kind: PotKind) {
  return pots.find(pot => pot.id === kind)!
}

// Temporary review installation. Disable to restore the original bench and open floor.
export function showPlantPreview(search: string) {
  return new URLSearchParams(search).get('plantPreview') !== 'false'
}
