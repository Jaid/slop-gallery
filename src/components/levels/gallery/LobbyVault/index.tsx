import type {Material} from 'three/webgpu'

import {CuboidCollider, CylinderCollider, RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import LobbyChandelierGeometry from '#src/lib/gallery/LobbyChandelierGeometry.ts'
import lobbyVault, {lobbyChandeliers} from '#src/lib/gallery/lobbyVault.ts'
import LobbyVaultGeometry, {lobbyVaultCollision, sunCenterY} from '#src/lib/gallery/LobbyVaultGeometry.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import LimestoneMaterial from '#src/lib/materials/LimestoneMaterial.ts'
import VaultGlassMaterial from '#src/lib/materials/VaultGlassMaterial.ts'

/**
 * The Lobby’s coffered barrel vault with its glazed crown, its north rose window and the gilt sun medallion answering it
 * on the south lunette, and the great chandeliers hanging from it.
 * Rendered inside the room’s group, at its center. `cladding` is the walls’ own travertine, carried on up the lunettes.
 */
export default function LobbyVault({cladding}: {
  cladding: Material
}) {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new LobbyVaultGeometry, []))
  const stone = useDisposable(useMemo(() => new LimestoneMaterial, []))
  // Cream coffer fields behind the white stone frames, gilt moldings and rosettes.
  const plaster = useDisposable(useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#ece7d9',
    heavy: isHeavy,
    roughness: 0.86,
  }), [isHeavy]))
  // Deep-blue fresco fields of the south sun medallion, matte plaster against the gilt relief laid over them.
  const sunField = useDisposable(useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#2f5e8d',
    heavy: isHeavy,
    roughness: 0.78,
  }), [isHeavy]))
  // Painted bronze glazing bars, as on the Salon’s skylight.
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
  // Cast conservatory glass like the floor’s, divided into the same panes as the bars in front of it.
  const glass = useDisposable(useMemo(() => new VaultGlassMaterial({
    heavy: isHeavy,
    paneSize: [lobbyVault.glazing.pane, lobbyVault.glazing.pane],
  }), [isHeavy]))
  const collision = useMemo(lobbyVaultCollision, [])
  return <group name='lobby-vault'>
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision} />
      {[-1, 1].map(side => <CuboidCollider key={side} args={[lobbyVault.outerRadius, (lobbyVault.crownY + lobbyVault.shell + lobbyVault.coffer.depth - lobbyVault.springY) / 2, lobbyVault.rose.lunetteThickness / 2]} position={[0, (lobbyVault.crownY + lobbyVault.shell + lobbyVault.coffer.depth + lobbyVault.springY) / 2, side * (lobbyVault.halfLength + lobbyVault.rose.lunetteThickness / 2)]} />)}
      {/* The south sun’s relief stands proud of the lunette face, toward the room; flat discs cover the medallion and its companions. */}
      <CylinderCollider args={[lobbyVault.sun.relief / 2, lobbyVault.sun.halo]} position={[0, sunCenterY, lobbyVault.halfLength - lobbyVault.sun.relief / 2]} rotation={[Math.PI / 2, 0, 0]} />
      {[-1, 1].map(flip => <CylinderCollider key={flip} args={[lobbyVault.sun.relief / 2, lobbyVault.sun.companionRadius]} position={[flip * lobbyVault.sun.companionCenter[0], lobbyVault.springY + lobbyVault.sun.companionCenter[1], lobbyVault.halfLength - lobbyVault.sun.relief / 2]} rotation={[Math.PI / 2, 0, 0]} />)}
    </RigidBody>
    <mesh castShadow geometry={geometry.clad} material={cladding} name='lobby-vault-lunettes' receiveShadow />
    <mesh castShadow geometry={geometry.stone} material={stone} name='lobby-vault-stone' receiveShadow />
    <mesh castShadow geometry={geometry.plaster} material={plaster} name='lobby-vault-coffers' receiveShadow />
    <mesh castShadow geometry={geometry.inlay} material={sunField} name='lobby-vault-sun-field' receiveShadow />
    <mesh castShadow geometry={geometry.gold} material={gilt} name='lobby-vault-gilding' receiveShadow />
    <mesh castShadow geometry={geometry.bars} material={bars} name='lobby-vault-glazing-bars' />
    {/* The glass lets the sun through: it casts no shadow, only its bars and tracery do. */}
    <mesh castShadow={false} geometry={geometry.glass} material={glass} name='lobby-vault-glass' />
    <mesh castShadow={false} geometry={geometry.roseGlass} material={glass} name='lobby-vault-rose-window' />
    <LobbyChandeliers />
  </group>
}

/**
 * The great chandeliers. They emit no light of their own: next to the sun pouring through the glazing, a light per fixture
 * hardly showed, and a shadowed point light cost six extra renders of the scene every frame. Their flames glow instead.
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
  return <group name='lobby-chandeliers'>
    {lobbyChandeliers.offsets.map(z => <group key={z} name={`lobby-chandelier-${z}`} position={[0, lobbyChandeliers.y, z]}>
      <mesh geometry={geometry.gilt} material={gold} name='lobby-chandelier-gilt' />
      <mesh geometry={geometry.candles} material={candles} name='lobby-chandelier-candles' />
      <mesh geometry={geometry.flames} material={flames} name='lobby-chandelier-flames' />
    </group>)}
  </group>
}
