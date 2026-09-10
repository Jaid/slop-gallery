import {useState} from 'react'
import Game from 'three-fiber-game'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import Scene from '#component/Scene'
import {playerSession} from '#src/lib/gallery/PlayerSession.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

import controls from './controls.ts'
import GameScene from './GameScene.tsx'

export default function World() {
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  const [initial] = useState(() => playerSession.snapshot())
  return <Game controls={controls} physics sceneWrapper={GameScene} shadows={profile.shadows} dpr={profile.dpr} camera={{
    fov: 62,
    position: [initial.position[0], initial.position[1] + 1.6, initial.position[2]],
    near: 0.05,
    far: 90,
  }}><Scene/></Game>
}
