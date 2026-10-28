import {egoControls} from 'ego-player'
import {useState} from 'react'
import Game from 'three-fiber-game'
import {useGraphicsModeValue} from 'use-graphics-mode'

import Scene from '#component/Scene'
import {playerSession} from '#src/lib/gallery/PlayerSession.ts'
import {usePhysicsHold} from '#src/lib/gallery/roomLoading.ts'
import {defaultFov, useCustomGraphics} from '#src/lib/rendering/customGraphics.ts'
import {createGalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {readNear} from '#src/lib/rendering/near.ts'
import {useZoomIndependentDpr} from '#src/lib/rendering/scale.ts'

import GameScene from './GameScene.tsx'

export default function World() {
  const profile = useGraphicsModeValue(getGraphicsProfile)
  // The permalink’s scale, unless the tuning panel of `?development` changed it.
  const dpr = useZoomIndependentDpr(useCustomGraphics(state => state.renderScale))
  const [initial] = useState(() => playerSession.snapshot())
  const [near] = useState(() => readNear())
  // Bodies would fall through the floors of rooms that are still loading.
  const held = usePhysicsHold(state => state.held)
  return <Game
    camera={{
      fov: defaultFov,
      position: [initial.position[0], initial.position[1] + 1.6, initial.position[2]],
      ...near === undefined ? {} : {near},
    }} controls={egoControls} dpr={dpr} physics={{paused: held}} renderer={createGalleryRenderer} sceneWrapper={GameScene} shadows={profile.shadows}
  ><Scene /></Game>
}
