import type {Vec3} from 'math'
import type {Material} from 'three/webgpu'

import {RigidBody} from '@react-three/rapier'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {MeshStandardNodeMaterial} from 'three/webgpu'

import KnotLabels from '#component/KnotLabels'
import KnotShowcase from '#component/KnotShowcase'
import MeshSurfaceCollider from '#component/MeshSurfaceCollider'
import {narrate, useEnvironmentSeed} from '#src/lib/gallery.ts'
import DisplayPedestalGeometry from '#src/lib/gallery/DisplayPedestalGeometry.ts'
import {tunnelSlope} from '#src/lib/gallery/lowerGallery.ts'
import exhibitionKnots, {exhibitionPedestal, exhibitionPedestalLobes, exhibitionSlots} from '#src/rooms/exhibition/knots.ts'

type PedestalMaterials = Record<'cap' | 'reveal' | 'stone', Material>

/** The Exhibition’s six Knots, which the environment’s seed picks, each floating over a half-round pedestal against its display’s back wall, with its nameplate on the lower sidecar merged into the pedestal’s north flank. */
export default function ExhibitionKnots({material}: {material: Material}) {
  const seed = useEnvironmentSeed()
  const knots = useMemo(() => exhibitionKnots(seed), [seed])
  const signs = useMemo(() => knots.map((knot, index) => ({
    entry: {
      ...knot.entry,
      label: exhibitionSlots[index].label,
    },
    ...exhibitionSlots[index].sign,
  })), [knots])
  const reveal = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#1f2628',
    roughness: 0.85,
  }), []))
  const cap = useDisposable(useMemo(() => new MeshStandardNodeMaterial({
    color: '#788586',
    metalness: 0.65,
    roughness: 0.35,
  }), []))
  const materials = {
    cap,
    reveal,
    stone: material,
  }
  const pedestals = {
    [-1]: usePedestalGeometry(-1),
    1: usePedestalGeometry(1),
  }
  return <group name='exhibition-knots'>
    {exhibitionSlots.map(slot => <Pedestal key={slot.id} geometry={pedestals[slot.direction]} materials={materials} name={`${slot.id}-pedestal`} position={slot.pedestal} />)}
    <KnotShowcase knots={knots} />
    <KnotLabels signs={signs} onActivate={entry => narrate(`prop-knot-${entry.id}`)} />
  </group>
}

function usePedestalGeometry(direction: -1 | 1) {
  return useDisposable(useMemo(() => new DisplayPedestalGeometry({
    direction,
    lobes: exhibitionPedestalLobes,
    plinth: exhibitionPedestal.plinth,
    slope: tunnelSlope,
  }), [direction]))
}
function Pedestal({geometry, materials, name, position}: {
  geometry: DisplayPedestalGeometry
  materials: PedestalMaterials
  name: string
  position: Vec3
}) {
  return <RigidBody colliders={false} name={name} position={position} type='fixed'>
    {geometry.collision.map((args, i) => <MeshSurfaceCollider key={i} args={args} />)}
    <mesh castShadow geometry={geometry.stone} material={materials.stone} receiveShadow />
    <mesh castShadow geometry={geometry.reveal} material={materials.reveal} receiveShadow />
    <mesh castShadow geometry={geometry.cap} material={materials.cap} receiveShadow />
  </RigidBody>
}
