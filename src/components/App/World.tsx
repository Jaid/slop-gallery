import Game from '#component/Game'
import Scene from '#component/Scene'

import controls from './controls.ts'

export default function World({lite}: {lite: boolean}) {
  return <Game shadows={!lite} controls={controls} physics lite={lite} dpr={lite ? 1 : [1, 2]} camera={{
    fov: 62,
    position: [0, 1.7, 5.8],
    near: 0.05,
    far: 90,
  }}><Scene/></Game>
}
