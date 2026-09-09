import Game from '#component/Game'
import Scene from '#component/Scene'

import controls from './controls.ts'

export default function World() {
  return <Game controls={controls} physics camera={{
    fov: 62,
    position: [0, 1.7, 5.8],
    near: 0.05,
    far: 90,
  }}><Scene/></Game>
}
