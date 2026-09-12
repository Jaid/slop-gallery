import type {GameWrapperProps} from 'three-fiber-game'

import Branch from 'branch-component'
import {useGraphicsQualityValue} from 'use-graphics-quality'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsQuality.ts'

/** Gallery integrations stay outside the physics subtree and share the WebGPU Canvas. */
export default function GameScene({children}: GameWrapperProps) {
  const profile = useGraphicsQualityValue(getGraphicsProfile)
  return <>
    <WebgpuCaptureBridge/>
    <TelemetryBridge/>
    {children}
    <Branch if={profile.postprocessing} then={Postprocessing}/>
  </>
}
