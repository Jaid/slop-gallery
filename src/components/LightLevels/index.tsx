import {useFrame, useThree} from '@react-three/fiber'

import {applyLightLevels} from '#src/lib/rendering/lightLevels.ts'

/** Applies light gains and switched-off lights right before the frame is drawn, after every regular frame callback, so they act on what the lights’ owners set this frame. */
export default function LightLevels() {
  const scene = useThree(state => state.scene)
  // The finish phase runs after the frame is drawn, too late for lights whose owners set them every frame.
  useFrame(() => applyLightLevels(scene), {before: 'render'})
  return null
}
