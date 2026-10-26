import Branch from 'branch-component'
import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import {knotFloorOrigin, knotFloorTile, knotGalleryCenter, knotGallerySize} from '#src/lib/gallery/knotGallery.ts'
import {CheckeredMarbleFloorMaterial, cremaMarfil, neroMarquina} from '#src/lib/materials/marble/index.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

/** Knottingham’s floor: polished cream and Nero Marquina marble in a checkerboard, mirroring the room in heavy mode. */
export default function KnotFloor() {
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  const material = useDisposable(useMemo(() => new CheckeredMarbleFloorMaterial({
    dark: neroMarquina,
    drift: true,
    grazingStrength: 0,
    light: cremaMarfil,
    loss: 0,
    origin: knotFloorOrigin,
    reflections: floorReflections,
    roughness: 0,
    seed: 3,
    strength: 0.2,
    tile: knotFloorTile,
  }), [floorReflections]))
  const reflection = material.reflectionTarget
  return <mesh name='knot-room-marble-floor' position={[knotGalleryCenter[0], 0.001, knotGalleryCenter[2]]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[knotGallerySize[0], knotGallerySize[2]]} />
    <primitive attach='material' object={material} />
    <Branch if={reflection}><primitive object={reflection!} /></Branch>
  </mesh>
}
