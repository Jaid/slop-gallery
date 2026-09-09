import Game from 'three-fiber-game'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import Scene from '#component/Scene'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

import controls from './controls.ts'
import GameScene from './GameScene.tsx'

export default function World() {
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  return <Game controls={controls} physics sceneWrapper={GameScene} shadows={profile.shadows} dpr={profile.dpr} camera={{
    fov: 62,
    position: [0, 1.7, 5.8],
    near: 0.05,
    far: 90,
  }}><Scene/></Game>
}
