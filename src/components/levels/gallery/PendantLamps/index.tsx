import type {PendantBody, PendantMount} from '#src/lib/gallery/pendants/index.ts'
import type {RoomId} from '#src/lib/gallery/types.ts'
import type {LanternLightsNode} from '#src/lib/materials/lights/index.ts'

import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial, PointLight} from 'three/webgpu'

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
export default function PendantLamps({body, glow, light, lights, lighting, mounts, name, optional = false, rooms}: {
  body: PendantBody
  glow: Glow
  light: PendantLight
  /** a dark zone these fixtures are the only light sources of; their lights join it and their own surfaces are lit by it */
  lighting?: LanternLightsNode
  /** per fixture, in mount order: changes to `light` for it */
  lights?: ReadonlyArray<Partial<PendantLight> | undefined>
  mounts: ReadonlyArray<PendantMount>
  name: string
  /** whether the lights go out with only the essential lamps */
  optional?: boolean
  /** the rooms the player must be in for the lights to shine, everywhere by default */
  rooms?: ReadonlyArray<RoomId>
}) {
  const set = useDisposable(useMemo(() => new PendantSet(body, mounts, glow, light, lights, lighting), [body, mounts, glow, light, lights, lighting]))
  return <group name={name}>
    {set.items.map(({mount, geometry, lamp, light: own}, i) => <group key={i} position={mount.light}>
      <mesh geometry={geometry.frame} material={set.frameMaterial} name={`${name}-${body.id}-frame`} />
      <mesh geometry={geometry.glow} material={set.glowMaterial} name={`${name}-${body.id}-glow`} />
      <Branch if={lamp}><primitive object={lamp!} userData-optional={optional} userData-rooms={rooms} /></Branch>
      <Branch not={lamp}><pointLight color={own.color} decay={own.decay ?? 2} distance={own.distance} intensity={own.intensity} position={[0, own.y ?? 0, 0]} userData-optional={optional} userData-rooms={rooms} /></Branch>
    </group>)}
  </group>
}

/** A dark zone’s lamp, tagged before it mounts so the zone’s first material build already sees it. */
function zoneLamp(light: PendantLight, lighting: LanternLightsNode) {
  const lamp = new PointLight(light.color, light.intensity, light.distance, light.decay ?? 2)
  lamp.position.y = light.y ?? 0
  Object.assign(lamp.userData, lighting.lampUserData())
  return lamp
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
    /** sole light source of a dark zone; a regular point light is rendered otherwise */
    lamp?: PointLight
    /** the fixture’s light, `light` with its changes */
    light: PendantLight
    mount: PendantMount
  }> = []

  constructor(body: PendantBody, mounts: ReadonlyArray<PendantMount>, glow: Glow, light: PendantLight, lights: ReadonlyArray<Partial<PendantLight> | undefined> = [], lighting?: LanternLightsNode) {
    this.glowMaterial = new MeshStandardNodeMaterial(glow)
    if (lighting) {
      lighting.adopt(this.frameMaterial)
      lighting.adopt(this.glowMaterial)
    }
    try {
      for (const [index, mount] of mounts.entries()) {
        const own = {
          ...light,
          ...lights[index],
        }
        this.items.push({
          mount,
          geometry: new PendantGeometry(body, mount),
          lamp: lighting && zoneLamp(own, lighting),
          light: own,
        })
      }
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  dispose() {
    for (const {geometry, lamp} of this.items) {
      geometry.dispose()
      lamp?.dispose()
    }
    this.frameMaterial.dispose()
    this.glowMaterial.dispose()
  }
}
