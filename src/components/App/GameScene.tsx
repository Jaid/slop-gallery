import type {GameWrapperProps} from 'three-fiber-game'

import {useGraphicsModeValue} from 'use-graphics-mode'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import {isKnottingham} from '#src/lib/level.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'

/** Gallery integrations stay outside the physics subtree and share the WebGPU Canvas. */
export default function GameScene({children}: GameWrapperProps) {
  const profile = useGraphicsModeValue(getGraphicsProfile)
  return <>
    <WebgpuCaptureBridge />
    <TelemetryBridge />
    {children}
    {profile.postprocessing && <Postprocessing contactDarkening={isKnottingham} knotFocus={isKnottingham} />}
  </>
}
