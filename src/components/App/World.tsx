import {egoControls} from 'ego-player'
import {useState} from 'react'
import Game from 'three-fiber-game'
import {useGraphicsModeValue} from 'use-graphics-mode'

import Scene from '#component/Scene'
import {playerSession} from '#src/lib/gallery/PlayerSession.ts'
import {createGalleryRenderer} from '#src/lib/rendering/GalleryRenderer.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {readNear} from '#src/lib/rendering/near.ts'
import {readScale, useZoomIndependentDpr} from '#src/lib/rendering/scale.ts'

import GameScene from './GameScene.tsx'

export default function World() {
  const profile = useGraphicsModeValue(getGraphicsProfile)
  const [scale] = useState(() => readScale() ?? 1)
  const dpr = useZoomIndependentDpr(scale)
  const [initial] = useState(() => playerSession.snapshot())
  const [near] = useState(() => readNear())
  return <Game
    camera={{
      fov: 62,
      position: [initial.position[0], initial.position[1] + 1.6, initial.position[2]],
      ...near === undefined ? {} : {near},
    }} controls={egoControls} dpr={dpr} physics renderer={createGalleryRenderer} sceneWrapper={GameScene} shadows={profile.shadows}
  ><Scene /></Game>
}
