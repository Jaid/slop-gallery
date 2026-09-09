import type {PlantGeometry} from './PlantGeometry.ts'
import type {PotGeometry} from './PotGeometry.ts'
import type {BufferGeometry} from 'three/webgpu'

/** Model triangles, counted once per mesh – not multiplied by shadows or material sides. */
export function triangleCount(geometry: BufferGeometry | null) {
  if (!geometry) {
    return 0
  }
  if (geometry.index) {
    return geometry.index.count / 3
  }
  return geometry.hasAttribute('position') ? geometry.getAttribute('position').count / 3 : 0
}

export function decorationComplexity(pot: PotGeometry, plant: PlantGeometry) {
  const potTriangles = triangleCount(pot.shell) + triangleCount(pot.soil) + triangleCount(pot.trim)
  const plantTriangles = triangleCount(plant.foliage) + triangleCount(plant.stems)
  return {
    potTriangles,
    plantTriangles,
    triangles: potTriangles + plantTriangles,
  }
}

const countFormat = new Intl.NumberFormat('en-US', {useGrouping: 'min2'})
export function complexityLabel({potTriangles, plantTriangles}: ReturnType<typeof decorationComplexity>) {
  const pot = countFormat.format(potTriangles).replaceAll(',', ' ')
  const plant = countFormat.format(plantTriangles).replaceAll(',', ' ')
  return `Complexity: ${pot} + ${plant} triangles`
}
