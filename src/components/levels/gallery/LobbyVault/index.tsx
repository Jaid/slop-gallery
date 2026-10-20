import type {Material} from 'three/webgpu'

import {CuboidCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import StudioEnvironment from 'knot-materials/StudioEnvironment.ts'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial, PointLight} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import LobbyChandelierGeometry, {lobbyChandelier} from '#src/lib/gallery/LobbyChandelierGeometry.ts'
import lobbyVault, {lobbyChandeliers} from '#src/lib/gallery/lobbyVault.ts'
import LobbyVaultGeometry, {lobbyVaultCollision, roseCenterY} from '#src/lib/gallery/LobbyVaultGeometry.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'
import ClearGlassMaterial from '#src/lib/materials/ClearGlassMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'
import StainedGlassMaterial from '#src/lib/materials/StainedGlassMaterial.ts'

/** Crystal mirrors a softly lit studio, like the gold, so its facets sparkle instead of reflecting the room’s olive haze. */
const crystalEnvironment = new StudioEnvironment

/**
 * The Lobby’s coffered barrel vault with its glazed crown and rose windows, and the great chandeliers hanging from it.
 * Rendered inside the room’s group, at its center. `cladding` and `trim` are the walls’ own travertine, carried on up the attic.
 */
export default function LobbyVault({cladding, trim}: {
  cladding: Material
  trim: Material
}) {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new LobbyVaultGeometry, []))
  const stone = useDisposable(useMemo(() => new LimestoneMaterial, []))
  // Deep, sky-colored coffer fields behind the white stone frames and gilt rosettes.
  const plaster = useDisposable(useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#5d7899',
    heavy: isHeavy,
    roughness: 0.86,
  }), [isHeavy]))
  // Painted bronze glazing bars, as on the Salon’s laylights.
  const bars = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#5b4a35',
    metalness: 0.5,
    roughness: 0.5,
  }), []))
  // Water-gilt ornament: on the vault, polished metal would mirror the dark coffers around it and turn black, so the leaf keeps a
  // little body color and catches the room’s own light.
  const gilt = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#d3a554',
    metalness: 0.55,
    roughness: 0.34,
  }), []))
  const glass = useDisposable(useMemo(() => skylightGlass(isHeavy), [isHeavy]))
  const rose = useDisposable(useMemo(() => new StainedGlassMaterial({
    center: [0, roseCenterY],
    radius: lobbyVault.rose.radius - lobbyVault.rose.ring,
    hub: lobbyVault.rose.hub,
    foil: lobbyVault.rose.foil,
    spokes: lobbyVault.rose.spokes,
  }), []))
  const collision = useMemo(lobbyVaultCollision, [])
  return <group name='lobby-vault'>
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      {[-1, 1].map(side => <CuboidCollider key={side} args={[(lobbyVault.outerRadius - lobbyVault.radius) / 2, (lobbyVault.springY - lobbyVault.atticBottom) / 2, lobbyVault.halfLength]} position={[side * (lobbyVault.radius + lobbyVault.outerRadius) / 2, (lobbyVault.springY + lobbyVault.atticBottom) / 2, 0]} />)}
      {[-1, 1].map(side => <CuboidCollider key={side} args={[lobbyVault.outerRadius, (lobbyVault.crownY + lobbyVault.shell + lobbyVault.coffer.depth - lobbyVault.atticBottom) / 2, lobbyVault.rose.lunetteThickness / 2]} position={[0, (lobbyVault.crownY + lobbyVault.shell + lobbyVault.coffer.depth + lobbyVault.atticBottom) / 2, side * (lobbyVault.halfLength + lobbyVault.rose.lunetteThickness / 2)]} />)}
    </RigidBody>
    <mesh castShadow geometry={geometry.clad} material={cladding} name='lobby-vault-attic' receiveShadow />
    <mesh castShadow geometry={geometry.trim} material={trim} name='lobby-vault-trim' receiveShadow />
    <mesh castShadow geometry={geometry.stone} material={stone} name='lobby-vault-stone' receiveShadow />
    <mesh castShadow geometry={geometry.plaster} material={plaster} name='lobby-vault-coffers' receiveShadow />
    <mesh castShadow geometry={geometry.gold} material={gilt} name='lobby-vault-gilding' receiveShadow />
    <mesh castShadow geometry={geometry.bars} material={bars} name='lobby-vault-glazing-bars' />
    {/* The glass lets the sun through: it casts no shadow, only its bars and tracery do. */}
    <mesh castShadow={false} geometry={geometry.glass} material={glass} name='lobby-vault-glass' />
    <mesh castShadow={false} geometry={geometry.roseGlass} material={rose} name='lobby-vault-rose-windows' />
    <LobbyChandeliers />
  </group>
}

/** The glass of the crown band: clear, flat panes that show the sky, or a light tint in fast mode. */
function skylightGlass(isHeavy: boolean) {
  if (isHeavy) {
    return new ClearGlassMaterial({
      name: 'lobby-skylight-glass-heavy',
      ior: 1.52,
      absorption: 0.04,
      envMapIntensity: 0.6,
    })
  }
  const material = new MeshStandardNodeMaterial({
    color: '#dcebf2',
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  })
  material.name = 'lobby-skylight-glass-fast'
  return material
}
/**
 * The great chandeliers, each with one warm light below it. The one over the fountain casts shadows; more shadowed lights would
 * exceed the textures a WebGPU shader stage can sample, and the sun already draws the room’s shadows. The fixtures themselves
 * cast none: one light under a whole chandelier would throw the shadow of its column and arms across the vault as one big blot,
 * where the real candles all around would wash it out.
 */
function LobbyChandeliers() {
  const geometry = useDisposable(useMemo(() => new LobbyChandelierGeometry(lobbyChandeliers.anchorY - lobbyChandeliers.y), []))
  const candles = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#efe2c4',
    roughness: 0.6,
  }), []))
  const flames = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#fff0b6',
    emissive: '#ffd36c',
    emissiveIntensity: 4,
    toneMapped: false,
  }), []))
  const crystal = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#f3f7ff',
    metalness: 1,
    roughness: 0.06,
    envMap: crystalEnvironment,
    envMapIntensity: 1.2,
    // Faceted lead crystal is lit through by the candles around it; a faint glow keeps the drops from going gray between glints.
    emissive: '#fff1d6',
    emissiveIntensity: 0.25,
  }), []))
  const lights = useDisposable(useMemo(() => new ChandelierLights, []))
  return <group name='lobby-chandeliers'>
    {lobbyChandeliers.offsets.map((z, i) => <group key={z} name={`lobby-chandelier-${z}`} position={[0, lobbyChandeliers.y, z]}>
      <mesh geometry={geometry.gilt} material={gold} name='lobby-chandelier-gilt' />
      <mesh geometry={geometry.candles} material={candles} name='lobby-chandelier-candles' />
      <mesh geometry={geometry.flames} material={flames} name='lobby-chandelier-flames' />
      <mesh geometry={geometry.crystal} material={crystal} name='lobby-chandelier-crystal' />
      <primitive object={lights.lights[i]} />
    </group>)}
  </group>
}
class ChandelierLights {
  readonly lights = lobbyChandeliers.offsets.map(z => {
    const light = new PointLight(lobbyChandeliers.color, lobbyChandeliers.intensity, lobbyChandeliers.distance, 2)
    light.name = `lobby-chandelier-light-${z}`
    light.position.set(0, lobbyChandelier.lightY, 0)
    light.castShadow = z === lobbyChandeliers.shadowCaster
    light.shadow.mapSize.set(1024, 1024)
    light.shadow.camera.near = 0.1
    light.shadow.camera.far = lobbyChandeliers.distance
    light.shadow.normalBias = 0.035
    return light
  })

  dispose() {
    for (const light of this.lights) {
      light.dispose()
    }
  }
}
