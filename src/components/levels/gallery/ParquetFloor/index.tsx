import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import ParquetFloorMaterial from '#src/lib/materials/ParquetFloorMaterial.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

/** A world-mapped herringbone parquet over a room’s floor slab; reflective in heavy mode. */
export default function ParquetFloor({width, depth, name, reflections}: {
  depth: number
  name: string
  reflections?: boolean
  width: number
}) {
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  const reflective = reflections ?? floorReflections
  const material = useDisposable(useMemo(() => new ParquetFloorMaterial(undefined, reflective), [reflective]))
  const reflection = material.reflection?.target
  return <mesh name={`${name}-parquet`} position={[0, 0.001, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[width, depth]} />
    <primitive attach='material' object={material} />
    <Branch if={reflection}><primitive object={reflection!} /></Branch>
  </mesh>
}
