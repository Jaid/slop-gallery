import {useThree} from '@react-three/fiber/webgpu'
import {useMemo} from 'react'
import {useEgoTelemetry} from 'telemethree-ego/react/webgpu'
import {useThreeTelemetry} from 'telemethree/react/webgpu'

import {AimInspector} from '#src/lib/development/AimInspector.ts'
import {playerTelemetry, telemetry} from '#src/lib/telemetry.ts'

function Collectors() {
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const inspector = useMemo(() => new AimInspector(scene, camera), [scene, camera])
  useThreeTelemetry({telemetry: telemetry!})
  useEgoTelemetry({
    telemetry: telemetry!,
    read: () => {
      const player = playerTelemetry.read?.()
      return player ? {
        ...player,
        aim: inspector.getAim(),
      } : null
    },
  })
  return null
}
function TelemetryBridge() {
  return telemetry ? <Collectors/> : null
}
export default TelemetryBridge
