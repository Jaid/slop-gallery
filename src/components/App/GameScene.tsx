import type {GameWrapperProps} from 'three-fiber-game'

import {useGraphicsQualityValue} from 'use-graphics-quality'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import {isKnottingham} from '#src/lib/level.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

/** Gallery integrations stay outside the physics subtree and share the WebGPU Canvas. */
export default function GameScene({children}: GameWrapperProps) {
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  return <>
    <WebgpuCaptureBridge/>
    <TelemetryBridge/>
    {children}
    {(profile.postprocessing || isKnottingham) && <Postprocessing quality={profile.postprocessing} knotFocus={isKnottingham}/>}
  </>
}
