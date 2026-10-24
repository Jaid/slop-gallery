import type {PendantBody, PendantMount} from '#src/lib/gallery/pendants/index.ts'
import type {RoomId} from '#src/lib/gallery/types.ts'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {PendantGeometry} from '#src/lib/gallery/pendants/index.ts'

export type PendantLight = {
  color: string
  decay?: number
  distance: number
  intensity: number
  /** height of the light relative to the fixture’s hanging point, 0 by default */
  y?: number
}
type Glow = {
  color: string
  emissive: string
  emissiveIntensity: number
}

/** Ceiling-hung light fixtures; each one’s rod reaches the ceiling surface found for its mount. */
export default function PendantLamps({body, glow, light, lights, mounts, name, optional = false, rooms}: {
  body: PendantBody
  glow: Glow
  light: PendantLight
  /** per fixture, in mount order: changes to `light` for it */
  lights?: ReadonlyArray<Partial<PendantLight> | undefined>
  mounts: ReadonlyArray<PendantMount>
  name: string
  /** whether the lights go out with only the essential lamps */
  optional?: boolean
  /** the rooms the player must be in for the lights to shine, everywhere by default */
  rooms?: ReadonlyArray<RoomId>
}) {
  const set = useDisposable(useMemo(() => new PendantSet(body, mounts, glow, light, lights), [body, mounts, glow, light, lights]))
  return <group name={name}>
    {set.items.map(({mount, geometry, light: own}, i) => <group key={i} position={mount.light}>
      <mesh geometry={geometry.frame} material={set.frameMaterial} name={`${name}-${body.id}-frame`} />
      <mesh geometry={geometry.glow} material={set.glowMaterial} name={`${name}-${body.id}-glow`} />
      <pointLight color={own.color} decay={own.decay ?? 2} distance={own.distance} intensity={own.intensity} position={[0, own.y ?? 0, 0]} userData-optional={optional} userData-rooms={rooms} />
    </group>)}
  </group>
}

class PendantSet {
  readonly frameMaterial = new MeshStandardNodeMaterial({
    color: '#34291d',
    metalness: 0.75,
    roughness: 0.4,
  })
  readonly glowMaterial: MeshStandardNodeMaterial
  readonly items: Array<{
    geometry: PendantGeometry
    /** the fixture’s light, `light` with its changes */
    light: PendantLight
    mount: PendantMount
  }> = []

  constructor(body: PendantBody, mounts: ReadonlyArray<PendantMount>, glow: Glow, light: PendantLight, lights: ReadonlyArray<Partial<PendantLight> | undefined> = []) {
    this.glowMaterial = new MeshStandardNodeMaterial(glow)
    try {
      for (const [index, mount] of mounts.entries()) {
        const own = {
          ...light,
          ...lights[index],
        }
        this.items.push({
          mount,
          geometry: new PendantGeometry(body, mount),
          light: own,
        })
      }
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  dispose() {
    for (const {geometry} of this.items) {
      geometry.dispose()
    }
    this.frameMaterial.dispose()
    this.glowMaterial.dispose()
  }
}
