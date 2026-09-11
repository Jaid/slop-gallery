import type {Vec3, Wall} from '#src/lib/gallery.ts'

import SoundboardLayout from './SoundboardLayout.ts'
import {archivedSoundEffects, enabledSoundEffects} from './soundEffects.ts'

export const soundboardLayout = new SoundboardLayout({
  enabled: enabledSoundEffects.length,
  archived: archivedSoundEffects.length,
})
export const soundboardBounds = soundboardLayout.bounds
export const soundboardSize = soundboardLayout.size
export const soundboardCenter: Vec3 = [0, 0, 0]

export const soundboardWalls: Array<Wall> = [
  {
    id: 'soundboard-enabled',
    center: [0, 0, soundboardBounds.northZ],
    rotation: 0,
    width: soundboardSize[0],
  },
  {
    id: 'soundboard-archived',
    center: [0, 0, soundboardBounds.southZ],
    rotation: Math.PI,
    width: soundboardSize[0],
  },
  {
    id: 'soundboard-west',
    center: [soundboardBounds.minX, 0, 0],
    rotation: Math.PI / 2,
    width: soundboardSize[2],
  },
  {
    id: 'soundboard-east',
    center: [soundboardBounds.maxX, 0, 0],
    rotation: -Math.PI / 2,
    width: soundboardSize[2],
  },
].map(wall => ({
  ...wall,
  center: wall.center as Vec3,
  room: 'lobby',
  height: soundboardBounds.height,
  hangable: false,
}))

export function insideSoundboard([x, y, z]: Vec3) {
  return x > soundboardBounds.minX + 0.6 && x < soundboardBounds.maxX - 0.6 && z > soundboardBounds.northZ + 0.6 && z < soundboardBounds.southZ - 0.6 && y >= -0.2 && y < soundboardBounds.height - 0.3
}

export function soundboardWallDistance(origin: Vec3, direction: Vec3) {
  if (!origin.every(Number.isFinite) || !direction.every(Number.isFinite)) {
    return Infinity
  }
  let nearest = Infinity
  for (const wall of soundboardWalls) {
    const sin = Math.sin(wall.rotation)
    const cos = Math.cos(wall.rotation)
    const facing = direction[0] * sin + direction[2] * cos
    if (Math.abs(facing) < 1e-12) {
      continue
    }
    const distance = ((wall.center[0] - origin[0]) * sin + (wall.center[2] - origin[2]) * cos) / facing
    if (distance < 0 || distance >= nearest) {
      continue
    }
    const x = origin[0] + direction[0] * distance - wall.center[0]
    const y = origin[1] + direction[1] * distance - wall.center[1]
    const z = origin[2] + direction[2] * distance - wall.center[2]
    const u = x * cos - z * sin
    if (Math.abs(u) <= wall.width / 2 + 1e-9 && y >= 0 && y <= wall.height) {
      nearest = distance
    }
  }
  return nearest === Infinity ? Infinity : nearest * Math.hypot(...direction)
}
