import {lobby} from './lobby.ts'
import {lowerGallery, oculusPlatform} from './lowerGallery.ts'

export const oculusTower = {
  x: lobby.opening.center[0],
  z: lobby.opening.center[1],
  radius: 2.2,
  height: 4.5,
  floorY: lowerGallery.floorY,
}
const startZ = oculusPlatform.position[2] + oculusPlatform.size[2] / 2
const endZ = oculusTower.z - oculusTower.radius - 0.1
const startY = oculusPlatform.position[1] + oculusPlatform.size[1] / 2
const endY = oculusTower.floorY + oculusTower.height
export const towerRamp = {
  startZ,
  endZ,
  startY,
  endY,
  width: 1.8,
  baseCornerRadius: 1.1,
  segments: 64,
  railHeight: 1,
}
// Keep the lower jamb fixed; the taller jamb meets the circular tower’s rear edge.
const archStartZ = startZ + 0.75
const archEndZ = oculusTower.z - oculusTower.radius
export const towerArch = {
  z: (archStartZ + archEndZ) / 2,
  width: archEndZ - archStartZ,
  height: 3.5,
  lowHeight: 2.7,
  cornerRadius: 0.7,
  highCornerRadius: 0.45,
}

const easedHeight = (t: number) => startY + t * t * (3 - 2 * t) * (endY - startY)

// Rendering, railings and navigation use the same gently eased longitudinal profile.
export function towerRampHeight(fraction: number) {
  const segment = Math.max(0, Math.min(1, fraction)) * towerRamp.segments
  const index = Math.floor(segment)
  const t = segment - index
  return easedHeight(index / towerRamp.segments) * (1 - t) + easedHeight(Math.min(index + 1, towerRamp.segments) / towerRamp.segments) * t
}
export function towerRampGradient(fraction: number) {
  return 6 * fraction * (1 - fraction) * (endY - startY) / (endZ - startZ)
}

// Quarter-circle fillets meet the base’s front face and the straight ramp sides tangentially.
export function towerRampHalfWidth(z: number) {
  const radius = towerRamp.baseCornerRadius
  const distance = Math.max(0, Math.min(radius, z - startZ))
  return towerRamp.width / 2 + radius - Math.sqrt(Math.max(0, radius * radius - (radius - distance) ** 2))
}

// Add angular samples near the base, where uniform longitudinal sampling would
// leave a visibly coarse first chord in the rounded corner.
export const towerRampSections = [
  ...new Set([
    ...Array.from({length: towerRamp.segments + 1}, (_, i) => startZ + (endZ - startZ) * i / towerRamp.segments),
    ...Array.from({length: 33}, (_, i) => startZ + towerRamp.baseCornerRadius * (1 - Math.cos(i / 32 * Math.PI / 2))),
  ]),
].toSorted((a, b) => a - b)

const neck = towerRamp.width / 2
const joinX = oculusTower.radius * 0.8
const joinZ = -oculusTower.radius * 0.6
const neckZ = endZ - oculusTower.z
const cubic = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d
const shoulder = Array.from({length: 17}, (_, i): [number, number] => {
  const t = i / 16
  return [cubic(neck, neck, joinX - 0.15, joinX, t), cubic(neckZ, neckZ + 0.25, joinZ - 0.2, joinZ, t)]
})
const angle = Math.atan2(joinZ, joinX)
// Tangent shoulders replace the rectangular landing’s corners. The outline is
// shared with point containment, so there are no invisible square ledges.
export const towerPlatformOutline: Array<[number, number]> = [
  [-neck, neckZ],
  ...shoulder,
  ...Array.from({length: 96}, (_, i): [number, number] => {
    const theta = angle + (Math.PI - 2 * angle) * (i + 1) / 96
    return [Math.cos(theta) * oculusTower.radius, Math.sin(theta) * oculusTower.radius]
  }),
  ...shoulder.slice(0, -1).toReversed().map(([x, z]): [number, number] => [-x, z]),
]
export function towerFloorHeight(x: number, z: number) {
  const localX = x - oculusTower.x
  const localZ = z - oculusTower.z
  let inside = false
  for (let i = 0, j = towerPlatformOutline.length - 1; i < towerPlatformOutline.length; j = i++) {
    const a = towerPlatformOutline[i]!
    const b = towerPlatformOutline[j]!
    if (a[1] > localZ !== b[1] > localZ && localX < (b[0] - a[0]) * (localZ - a[1]) / (b[1] - a[1]) + a[0]) {
      inside = !inside
    }
  }
  if (inside) {
    return endY
  }
  if (Math.abs(localX) <= towerRampHalfWidth(z) && z >= startZ && z <= endZ) {
    return towerRampHeight((z - startZ) / (endZ - startZ))
  }
}
