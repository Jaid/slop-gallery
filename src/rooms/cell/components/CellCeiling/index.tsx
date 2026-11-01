import type {Material} from 'three/webgpu'

import {CuboidCollider, CylinderCollider, RigidBody} from '@react-three/rapier'
import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import useGraphicsMode from 'use-graphics-mode'

import CellCeilingGeometry, {cellCeilingSlab, cellCoffers, cofferLine} from '#src/lib/gallery/CellCeilingGeometry.ts'
import ArchitecturalPlasterMaterial from '#src/lib/materials/ArchitecturalPlasterMaterial.ts'
import gold from '#src/lib/materials/gold.ts'
import sandbox from '#src/worlds/sandbox/index.ts'

const cell = sandbox.room('cell')
const {layout} = cell.room
const [width, depth] = layout.size
const {beam, count: [countX, countZ]} = cellCoffers
const beamY = layout.height - cellCeilingSlab / 2 - beam.depth / 2

/** The Cell’s ceilings: the hall’s coffered under a grid of beams in the walls’ joinery, its fields framed by gilt fillets round gilt rosettes and a ceiling rose round the chandelier’s canopy, and the round spaces’ in the same plaster with a gilt ring and a rosette each, with colliders under their slabs and the beams. */
export default function CellCeiling({beams}: {
  /** the wood of the beams, its grain along each mesh’s x axis */
  beams: Material
}) {
  const isHeavy = useGraphicsMode()
  const geometry = useDisposable(useMemo(() => new CellCeilingGeometry(layout), []))
  // A warm, tawny plaster between the beams and over the round spaces alike.
  const plaster = useDisposable(useMemo(() => new ArchitecturalPlasterMaterial({
    baseColor: '#7a5a42',
    heavy: isHeavy,
    roughness: 0.88,
  }), [isHeavy]))
  return <group name='cell-ceiling' position={cell.toWorld([0, 0, 0])}>
    <RigidBody colliders={false} type='fixed'>
      <CuboidCollider args={[width / 2, cellCeilingSlab / 2, depth / 2]} position={[0, layout.height, 0]} />
      {cofferLine(depth, countZ).beams.map(z => <CuboidCollider key={`x${z}`} args={[width / 2, beam.depth / 2, beam.width / 2]} position={[0, beamY, z]} />)}
      {cofferLine(width, countX).beams.map(x => <CuboidCollider key={`z${x}`} args={[beam.width / 2, beam.depth / 2, depth / 2]} position={[x, beamY, 0]} />)}
      {layout.spaces.map(space => <CylinderCollider key={space.name} args={[cellCeilingSlab / 2, space.radius]} position={[space.center[0], layout.height, space.center[1]]} />)}
    </RigidBody>
    <mesh castShadow geometry={geometry.hall} material={plaster} name='cell-ceiling-hall' receiveShadow />
    <mesh castShadow geometry={geometry.beams} material={beams} name='cell-ceiling-beams' receiveShadow />
    <mesh castShadow geometry={geometry.crossBeams} material={beams} name='cell-ceiling-cross-beams' receiveShadow rotation={[0, Math.PI / 2, 0]} />
    <mesh geometry={geometry.gilt} material={gold} name='cell-ceiling-gilt' receiveShadow />
    <Branch if={layout.spaces.length > 0}><mesh castShadow geometry={geometry.rounds} material={plaster} name='cell-ceiling-rounds' receiveShadow /></Branch>
  </group>
}
