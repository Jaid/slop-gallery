import type {Vector3} from 'three/webgpu'

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
export const getCapsuleHalfHeight = (height: number, radius: number) => Math.max(0, height / 2 - radius)
export const getJumpVelocity = (height: number, gravity = 9.81) => Math.sqrt(2 * Math.max(gravity, 0) * Math.max(height, 0))
export function approachHorizontal(current: Vector3, target: Vector3, maxDelta: number) {
  const dx = target.x - current.x
  const dz = target.z - current.z
  const distance = Math.hypot(dx, dz)
  if (distance <= maxDelta || distance === 0) {
    current.x = target.x
    current.z = target.z
    return
  }
  const factor = maxDelta / distance
  current.x += dx * factor
  current.z += dz * factor
}
