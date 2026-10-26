import type {FloorRoom} from '#src/lib/gallery/floors.ts'
import type {Material, Texture} from 'three/webgpu'

import useDisposable from 'disposable-lifetime/react'
import {useMemo} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import RoomFloor from '#component/levels/gallery/RoomFloor'
import {dineFloorOrigin, dineFloorTile} from '#src/lib/gallery/dine.ts'
import {CheckeredMarbleFloorMaterial} from '#src/lib/materials/marble/index.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

/** Dine’s floor: polished Calacatta and Portoro marble in a checkerboard, mirroring the room in heavy mode. */
export default function DineFloor(props: {
  glass: Material
  room: FloorRoom
  stone: Texture
  wood: Texture
}) {
  const {floorReflections} = useGraphicsModeValue(getGraphicsProfile)
  const slab = useDisposable(useMemo(() => new CheckeredMarbleFloorMaterial({
    gaussianBlur: 2,
    loss: 0,
    grazingStrength: 0.2,
    origin: dineFloorOrigin,
    tile: dineFloorTile,
    reflections: floorReflections,
    strength: 0.3,
  }), [floorReflections]))
  const materials = useMemo(() => ({
    slab,
    reflection: slab.reflection?.target,
  }), [slab])
  return <RoomFloor {...props} materials={materials} />
}
