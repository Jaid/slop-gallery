import type {PendantBody, PendantMount} from '#src/lib/gallery/pendants/index.ts'
import type {LanternBounce, LanternLightsNode} from '#src/lib/materials/lights/index.ts'

import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import {PendantGeometry} from '#src/lib/gallery/pendants/index.ts'
import {LanternLight} from '#src/lib/materials/lights/index.ts'

type Glow = {
  color: string
  emissive: string
  emissiveIntensity: number
}
type Light = {
  /** light thrown back by the surroundings, only used by lamps of a dark zone */
  bounce?: LanternBounce
  color: string
  decay?: number
  distance: number
  intensity: number
}

/** Ceiling-hung light fixtures; each one’s rod reaches the ceiling surface found for its mount. */
export default function PendantLamps({body, glow, light, lighting, mounts, name}: {
  body: PendantBody
  glow: Glow
  light: Light
  /** a dark zone these fixtures are the only light sources of; their lights join it and their own surfaces are lit by it */
  lighting?: LanternLightsNode
  mounts: ReadonlyArray<PendantMount>
  name: string
}) {
  const set = useDisposable(useMemo(() => new PendantSet(body, mounts, glow, lighting && {
    lighting,
    light,
  }), [body, mounts, glow, light, lighting]))
  return <group name={name}>
    {set.items.map(({mount, geometry, lamp}, i) => <group key={i} position={mount.light}>
      <mesh geometry={geometry.frame} material={set.frameMaterial} name={`${name}-${body.id}-frame`} />
      <mesh geometry={geometry.glow} material={set.glowMaterial} name={`${name}-${body.id}-glow`} />
      <Branch if={lamp}><primitive object={lamp!} /></Branch>
      <Branch not={lamp}><pointLight color={light.color} decay={light.decay ?? 2} distance={light.distance} intensity={light.intensity} /></Branch>
    </group>)}
  </group>
}

function zoneLamp(body: PendantBody, light: Light, lighting: LanternLightsNode) {
  const lamp = new LanternLight({
    ...light,
    roof: body.roof,
  })
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
    /** sole light source of a dark zone, shaded by the fixture’s roof; a regular point light is rendered otherwise */
    lamp?: LanternLight
    mount: PendantMount
  }> = []

  constructor(body: PendantBody, mounts: ReadonlyArray<PendantMount>, glow: Glow, zone?: {
    light: Light
    lighting: LanternLightsNode
  }) {
    this.glowMaterial = new MeshStandardNodeMaterial(glow)
    if (zone) {
      zone.lighting.adopt(this.frameMaterial)
      zone.lighting.adopt(this.glowMaterial)
    }
    try {
      for (const mount of mounts) {
        this.items.push({
          mount,
          geometry: new PendantGeometry(body, mount),
          lamp: zone && zoneLamp(body, zone.light, zone.lighting),
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
