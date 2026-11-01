import type {Material} from 'three/webgpu'

import {CuboidCollider, CylinderCollider, RigidBody, TrimeshCollider} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import {colliderGeometry} from '#src/lib/gallery/architecture.ts'
import CellCeilingGeometry, {cellCeilingSlab, cellRidge} from '#src/lib/gallery/CellCeilingGeometry.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'
import BrassMaterial from '#src/lib/materials/BrassMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import sandbox from '#src/worlds/sandbox/index.ts'

const cell = sandbox.room('cell')
const {layout} = cell.room
const {vestibule} = layout
const [width] = layout.size

/** The Cell’s ceilings: the hall’s gabled one, coffered up both slopes between walnut purlins and rafters, its fields framed by gilt fillets, under a walnut ridge beam the chandelier hangs from on a brass rod, its gables papered like the walls, and the round room’s level one in the same plaster with a gilt ring, with colliders under their slabs, the beams and the gables. */
export default function CellCeiling({beams, paper}: {
  /** the wood of the beams, its grain along each mesh’s x axis */
  beams: Material
  /** the hall’s wallpaper, which the gables carry on up to the slopes */
  paper: Material
}) {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new CellCeilingGeometry(layout), []))
  const collision = useMemo(() => ({
    beams: colliderGeometry(geometry.beams),
    crossBeams: colliderGeometry(geometry.crossBeams),
    gables: colliderGeometry(geometry.gables),
  }), [geometry])
  // A warm, tawny plaster between the beams and over the round room alike.
  const plaster = useDisposable(useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#7a5a42',
    heavy: isHeavy,
    roughness: 0.88,
  }), [isHeavy]))
  const brass = useDisposable(useMemo(() => new BrassMaterial, []))
  return <group name='cell-ceiling' position={cell.toWorld([0, 0, 0])}>
    {geometry.slopes.map(({position, rotation}, index) => <group key={index} name={`cell-ceiling-slope-${index}`} position={position} rotation={rotation}>
      <RigidBody colliders={false} type='fixed'>
        <CuboidCollider args={[width / 2, cellCeilingSlab / 2, geometry.length / 2]} position={[0, cellCeilingSlab / 2, 0]} />
        <TrimeshCollider args={collision.beams} />
        <group rotation={[0, Math.PI / 2, 0]}>
          <TrimeshCollider args={collision.crossBeams} />
        </group>
      </RigidBody>
      <mesh castShadow geometry={geometry.slab} material={plaster} name='cell-ceiling-hall' receiveShadow />
      <mesh castShadow geometry={geometry.beams} material={beams} name='cell-ceiling-beams' receiveShadow />
      <mesh castShadow geometry={geometry.crossBeams} material={beams} name='cell-ceiling-cross-beams' receiveShadow rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={geometry.gilt} material={gold} name='cell-ceiling-gilt' receiveShadow />
    </group>)}
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[width / 2, cellRidge.depth / 2, cellRidge.width / 2]} position={[0, layout.ridgeHeight - cellCeilingSlab / 2 - cellRidge.depth / 2, 0]} />
      <TrimeshCollider args={collision.gables} />
      {vestibule && <CylinderCollider args={[cellCeilingSlab / 2, vestibule.radius]} position={[vestibule.center[0], layout.height, vestibule.center[1]]} />}
    </RigidBody>
    <mesh castShadow geometry={geometry.ridge} material={beams} name='cell-ceiling-ridge' receiveShadow />
    <mesh castShadow geometry={geometry.hanger} material={brass} name='cell-chandelier-rod' receiveShadow />
    <mesh castShadow geometry={geometry.gables} material={paper} name='cell-gables' receiveShadow />
    <Branch if={vestibule}>
      <>
        <mesh castShadow geometry={geometry.rounds} material={plaster} name='cell-ceiling-rounds' receiveShadow />
        <mesh geometry={geometry.roundGilt} material={gold} name='cell-ceiling-round-gilt' receiveShadow />
      </>
    </Branch>
  </group>
}
