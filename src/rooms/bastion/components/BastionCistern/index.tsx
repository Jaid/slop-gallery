import type {Material} from 'three/webgpu'

import {CoefficientCombineRule} from '@dimforge/rapier3d-compat'
import {CuboidCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'
import useGraphicsMode from 'use-graphics-mode'

import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import PendantLamps from '#component/PendantLamps'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {vaultShellThickness, wallFace} from '#src/lib/gallery/architectureDimensions.ts'
import {cistern, cisternBackstop, cisternDomeRibs, cisternLantern} from '#src/lib/gallery/cistern/cistern.ts'
import CisternGeometry, {cisternGrilleGeometry} from '#src/lib/gallery/cistern/CisternGeometry.ts'
import DrainGeometry from '#src/lib/gallery/cistern/DrainGeometry.ts'
import HalfDomeGeometry from '#src/lib/gallery/cistern/HalfDomeGeometry.ts'
import {routeRibDepth, routeRibThickness} from '#src/lib/gallery/passages/RoutedPassage.ts'
import {passageLantern, passageLanternGlow} from '#src/lib/gallery/pendants/passageLantern.ts'
import CisternWaterMaterial from '#src/lib/materials/CisternWaterMaterial.ts'
import FountainWaterMaterial from '#src/lib/materials/FountainWaterMaterial.ts'
import {lightIndoors} from '#src/lib/materials/lights/index.ts'

const mounts = [cisternLantern]

/**
 * The Bastion’s cistern behind the Forge’s vestibule: its floor with the channel sunk into it and the water running along it, the backstop over the channel behind the grille, the half dome with its ribs and its lantern, the grille’s iron and its reveal, and the drain in the approach’s floor that the channel’s water spills into out of the culvert.
 * The backstop’s iron face gives nothing back and the channel’s water swallows any bounce: an orb shot against the backstop drops dead into the channel and rolls out with the water through the culvert.
 */
export default function BastionCistern({stone}: {stone: Material}) {
  const isHeavy = useGraphicsMode()
  const parts = useDisposable(useMemo(() => new CisternGeometry, []))
  const dome = useDisposable(useMemo(() => new HalfDomeGeometry({
    center: cistern.center,
    radius: cistern.radius - wallFace,
    spring: cistern.spring,
    rise: cistern.rise,
  }, {
    ribs: cisternDomeRibs,
    ribSection: [routeRibDepth, routeRibThickness],
    thickness: vaultShellThickness,
  }), []))
  const drain = useDisposable(useMemo(() => new DrainGeometry, []))
  const grille = useDisposable(useMemo(cisternGrilleGeometry, []))
  const collision = useMemo(() => ({
    floor: colliderGeometry(parts.floor),
    channel: colliderGeometry(parts.channelCollision),
    dome: colliderGeometry(dome.surface),
    grille: [grille.reveal, grille.bars].map(colliderGeometry),
  }), [dome, grille, parts])
  // The apse’s wrought iron.
  const iron = useDisposable(useMemo(() => lightIndoors(new MeshStandardNodeMaterial({
    color: '#2a2724',
    metalness: 0.75,
    roughness: 0.5,
    envMapIntensity: 0.3,
  })), []))
  const water = useDisposable(useMemo(() => lightIndoors(new CisternWaterMaterial), []))
  const falling = useDisposable(useMemo(() => lightIndoors(new FountainWaterMaterial(true, isHeavy)), [isHeavy]))
  const [depth, width, height] = cisternBackstop.size
  const [faceX, , faceZ] = cisternBackstop.face
  const dead = {
    restitution: 0,
    restitutionCombineRule: CoefficientCombineRule.Min,
  }
  return <group name='bastion-cistern'>
    <RigidBody colliders={false} type='fixed'>
      <MeshSurfaceCollider args={collision.floor} />
      {/* Its water swallows whatever drops into it. */}
      <MeshSurfaceCollider args={collision.channel} {...dead} />
      {/* Its iron face gives nothing back, and nothing slides along it. */}
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} friction={0} frictionCombineRule={CoefficientCombineRule.Min} position={[faceX, cisternBackstop.underside + height / 2, faceZ - depth / 2]} {...dead} />
      <TrimeshCollider args={collision.dome} />
      {collision.grille.map((args, i) => <TrimeshCollider key={i} args={args} />)}
      <mesh geometry={parts.floor} material={stone} name='cistern-floor' receiveShadow />
      <mesh castShadow geometry={parts.channel} material={stone} name='cistern-channel' receiveShadow />
      <mesh castShadow geometry={parts.backstop} material={stone} name='cistern-backstop' receiveShadow />
      <mesh castShadow geometry={parts.plate} material={iron} name='cistern-backstop-plate' receiveShadow />
      <mesh castShadow geometry={dome.shell} material={stone} name='cistern-dome' receiveShadow />
      <mesh castShadow geometry={dome.ribs} material={stone} name='cistern-dome-ribs' receiveShadow />
      <mesh castShadow geometry={grille.reveal} material={stone} name='cistern-grille-reveal' receiveShadow />
      <mesh castShadow geometry={grille.bars} material={iron} name='cistern-grille-bars' receiveShadow />
    </RigidBody>
    <mesh geometry={parts.water} material={water} name='cistern-water' receiveShadow />
    <mesh geometry={parts.outfall} material={falling} name='cistern-outfall' />
    {/* Only for the eye: the approach’s paving runs on under it for whatever rolls out of the culvert. */}
    <group name='cistern-drain'>
      <mesh geometry={drain.sump} material={stone} name='cistern-drain-sump' receiveShadow />
      <mesh geometry={drain.water} material={water} name='cistern-drain-water' />
      <mesh castShadow geometry={drain.grate} material={iron} name='cistern-drain-grate' receiveShadow />
    </group>
    <PendantLamps body={passageLantern} glow={passageLanternGlow} mounts={mounts} name='cistern-pendants' />
  </group>
}
