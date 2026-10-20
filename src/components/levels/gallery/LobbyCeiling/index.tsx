import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshPhysicalNodeMaterial, MeshStandardNodeMaterial} from 'three/webgpu'

import MeshSurfaceCollider from '#component/levels/gallery/MeshSurfaceCollider'
import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import {lobbyChandeliers} from '#src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '#src/lib/gallery/LobbyCeilingGeometry.ts'
import LobbyChandelierGeometry from '#src/lib/gallery/LobbyChandelierGeometry.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'
import BronzeMaterial from '#src/lib/materials/BronzeMaterial.ts'
import ClearGlassMaterial from '#src/lib/materials/ClearGlassMaterial.ts'
import ChandelierLightsNode from '#src/lib/materials/lights/ChandelierLightsNode.ts'
import PolishedBrassMaterial from '#src/lib/materials/PolishedBrassMaterial.ts'

/** Tall round vault, carved coffers, gilt ribs and real clear glazing. Rendered at the Lobby’s floor-level center. */
export default function LobbyCeiling() {
  const geometry = useDisposable(useMemo(() => new LobbyCeilingGeometry, []))
  const fixtures = useDisposable(useMemo(() => new LobbyChandelierGeometry, []))
  const roofCollision = useMemo(() => [geometry.plaster, geometry.ribs, geometry.glass].map(colliderGeometry), [geometry])
  const fixtureCollision = useMemo(() => [fixtures.metal, fixtures.suspension].map(colliderGeometry), [fixtures])
  const plaster = useDisposable(useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#e5dfcf',
    heavy: true,
    roughness: 0.86,
  }), []))
  const trim = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#f3ead8',
    roughness: 0.72,
  }), []))
  const fixtureLights = useMemo(() => new ChandelierLightsNode, [])
  const fixtureBrass = useDisposable(useMemo(() => fixtureLights.adopt(new PolishedBrassMaterial), [fixtureLights]))
  const candles = useDisposable(useMemo(() => fixtureLights.adopt(new MeshStandardNodeMaterial({
    color: '#f8e9cb',
    roughness: 0.65,
  })), [fixtureLights]))
  const crystals = useDisposable(useMemo(() => fixtureLights.adopt(new MeshPhysicalNodeMaterial({
    color: '#a9c5c9',
    envMapIntensity: 0.65,
    metalness: 0.15,
    roughness: 0.15,
  })), [fixtureLights]))
  const gold = useDisposable(useMemo(() => new PolishedBrassMaterial, []))
  const bronze = useDisposable(useMemo(() => new BronzeMaterial, []))
  const glass = useDisposable(useMemo(() => new ClearGlassMaterial({
    absorption: 0.025,
    ior: 1.52,
    envMapIntensity: 0.22,
    name: 'lobby-vault-clear-glass',
  }), []))
  return <group name='lobby-cathedral-ceiling'>
    <mesh castShadow geometry={geometry.plaster} material={plaster} name='lobby-vault-shell' receiveShadow />
    <mesh castShadow geometry={geometry.ribs} material={trim} name='lobby-vault-carvings' receiveShadow />
    <mesh geometry={geometry.gold} material={gold} name='lobby-vault-gilding' />
    <mesh castShadow geometry={geometry.bars} material={bronze} name='lobby-vault-tracery' receiveShadow />
    {/* Clear glass transmits the sun; neither the glass nor an invisible flat slab casts an opaque roof shadow. */}
    <mesh castShadow={false} geometry={geometry.glass} material={glass} name='lobby-vault-glass' />
    <RigidBody colliders={false} type='fixed'>
      {roofCollision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
    </RigidBody>
    {lobbyChandeliers.offsets.map(z => <group key={z} name={`lobby-chandelier-${z}`} position={[0, lobbyChandeliers.y, z]}>
      <mesh castShadow geometry={fixtures.metal} material={fixtureBrass} name='lobby-chandelier-corona' receiveShadow />
      <mesh castShadow geometry={fixtures.suspension} material={bronze} name='lobby-chandelier-suspension' />
      <mesh geometry={fixtures.candles} material={candles} name='lobby-chandelier-candles' />
      <mesh geometry={fixtures.flames} name='lobby-chandelier-flames'><meshBasicNodeMaterial color={[3.5, 2.1, 0.7]} /></mesh>
      <mesh geometry={fixtures.crystals} material={crystals} name='lobby-chandelier-crystals' />
      <pointLight color={lobbyChandeliers.color} decay={2} distance={lobbyChandeliers.distance} intensity={lobbyChandeliers.intensity} position={[0, -1.3, 0]} userData={fixtureLights.lampUserData()} />
      <RigidBody colliders={false} type='fixed'>
        {fixtureCollision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
      </RigidBody>
    </group>)}
  </group>
}
