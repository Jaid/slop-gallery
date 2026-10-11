import type {GameWrapperProps} from 'three-fiber-game'

import Branch from 'branch-component'
import {useState} from 'react'
import {useGraphicsModeValue} from 'use-graphics-mode'

import Postprocessing from '#component/Postprocessing'
import TelemetryBridge from '#component/TelemetryBridge'
import WebgpuCaptureBridge from '#component/WebgpuCaptureBridge'
import WireframeVision from '#component/WireframeVision'
import {isKnottingham} from '#src/lib/level.ts'
import {getGraphicsProfile} from '#src/lib/rendering/graphicsMode.ts'
import {readVisionMode} from '#src/lib/rendering/visionMode.ts'

/** Gallery integrations stay outside the physics subtree and share the WebGPU Canvas. */
export default function GameScene({children}: GameWrapperProps) {
  const profile = useGraphicsModeValue(getGraphicsProfile)
  const [visionMode] = useState(() => readVisionMode())
  return <>
    <WebgpuCaptureBridge />
    <TelemetryBridge />
    {children}
    <Branch if={visionMode === 'wireframe'} then={WireframeVision} else={<Branch if={profile.postprocessing}><Postprocessing contactDarkening={isKnottingham} knotFocus={isKnottingham} /></Branch>} />
  </>
}
