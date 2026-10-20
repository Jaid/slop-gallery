import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {rooms} from '#src/lib/gallery.ts'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import lobbyCeiling, {lobbyChandeliers, lobbyDaylights, lobbySkylightFields} from '#src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '#src/lib/gallery/LobbyCeilingGeometry.ts'
import CofferPlasterMaterial from '#src/lib/materials/CofferPlasterMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import {LanternLight} from '#src/lib/materials/lights/index.ts'
import SkyBoxMaterial from '#src/lib/materials/SkyBoxMaterial.ts'
import VaultGlassMaterial from '#src/lib/materials/VaultGlassMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!
const skylightFields = lobbySkylightFields().map(({center, size}) => ({
  center: [room.center[0] + center[0], room.center[1] + center[1]] as const,
  size,
}))

/**
 * The Lobby’s barrel-vaulted cathedral ceiling, glazed crown skylights, procedural sky dome and three grand two-tier chandeliers.
 * Rendered inside the Lobby room’s group, at its center.
 */
export default function LobbyCeiling() {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new LobbyCeilingGeometry, []))
  const collision = useMemo(() => [geometry.plaster, geometry.glass].map(colliderGeometry), [geometry])
  const plaster = useDisposable(useMemo(() => new CofferPlasterMaterial({
    color: '#ece7d9',
    fields: skylightFields,
    glassY: lobbyCeiling.springY + lobbyCeiling.radius * 0.72,
    reach: 1.2,
    spill: 0.16,
    spillColor: '#eef5ff',
  }), []))
  const bars = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#5c4932',
    metalness: 0.48,
    roughness: 0.48,
  }), []))
  const candles = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#ebd4a7',
    roughness: 0.62,
  }), []))
  const flames = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#fff2be',
    emissive: '#ffd56b',
    emissiveIntensity: 3.4,
    toneMapped: false,
  }), []))
  const glass = useDisposable(useMemo(() => new VaultGlassMaterial({
    heavy: isHeavy,
    paneSize: [lobbyCeiling.pane, lobbyCeiling.pane],
  }), [isHeavy]))
  const sky = useDisposable(useMemo(() => new SkyBoxMaterial({
    origin: [room.center[0], lobbyCeiling.springY, room.center[1]],
    sunDirection: lobbyCeiling.skyDome.sunDirection,
  }), []))
  const lights = useDisposable(useMemo(() => new LobbyVaultLights, []))
  return <group name='lobby-ceiling'>
    <RigidBody colliders={false} type='fixed'>
      {collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
    </RigidBody>
    <mesh castShadow={false} frustumCulled={false} geometry={geometry.sky} material={sky} name='lobby-skybox' />
    <mesh castShadow={false} geometry={geometry.plaster} material={plaster} name='lobby-ceiling-coffers' receiveShadow />
    <mesh castShadow={false} geometry={geometry.gilt} material={gold} name='lobby-ceiling-gilt' receiveShadow />
    <mesh castShadow={false} geometry={geometry.bars} material={bars} name='lobby-ceiling-glazing-bars' />
    <mesh castShadow={false} geometry={geometry.candles} material={candles} name='lobby-chandelier-candles' />
    <mesh castShadow={false} geometry={geometry.flames} material={flames} name='lobby-chandelier-flames' />
    <mesh castShadow={false} geometry={geometry.glass} material={glass} name='lobby-ceiling-skylights' />
    {lights.all.map(light => <primitive key={light.uuid} object={light} />)}
  </group>
}

/**
 * The Lobby’s light sources: warm candle-gold LanternLights suspended below each grand chandelier (shaded upward so the central
 * spine plaster keeps its relief), plus high sky-daylight LanternLights under the glazed vault crown.
 */
class LobbyVaultLights {
  readonly chandelierLights = lobbyChandeliers.offsets.map(z => {
    const light = new LanternLight({
      color: lobbyChandeliers.light.color,
      intensity: lobbyChandeliers.light.intensity,
      distance: lobbyChandeliers.light.distance,
      decay: 2,
      roof: lobbyChandeliers.light.roof,
    })
    light.name = `lobby-chandelier-light-${z}`
    light.position.set(0, lobbyChandeliers.hubY + lobbyChandeliers.light.offsetY, z)
    return light
  })

  readonly daylights = lobbyDaylights.offsets.map(z => {
    const shadows = z === lobbyDaylights.shadowCaster
    const lamp = new LanternLight({
      color: lobbyDaylights.color,
      intensity: lobbyDaylights.intensity,
      distance: shadows ? lobbyDaylights.shadowDistance : lobbyDaylights.distance,
      decay: 2,
      roof: lobbyDaylights.roof,
    })
    lamp.name = `lobby-daylight-${z}`
    lamp.position.set(0, lobbyDaylights.y, z)
    lamp.castShadow = shadows
    lamp.shadow.mapSize.set(1024, 1024)
    lamp.shadow.normalBias = 0.03
    return lamp
  })

  get all() {
    return [...this.chandelierLights, ...this.daylights]
  }

  dispose() {
    for (const light of this.all) {
      light.dispose()
    }
  }
}
