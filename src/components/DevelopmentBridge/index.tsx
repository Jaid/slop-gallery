import {useThree} from '@react-three/fiber/webgpu'
import {useEffect} from 'react'

import {AimInspector} from '#src/lib/development/AimInspector.ts'
import {installDevelopmentApi} from '#src/lib/development/api.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'

export default function DevelopmentBridge() {
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  useEffect(() => installDevelopmentApi(globalThis.window, location.search, () => {
    const inspector = new AimInspector(scene, camera)
    return {
      getAim: () => inspector.getAim(),
      getTelemetry: () => {
        if (!telemetry) {
          return null
        }
        return {
          sessionId: telemetry.sessionId,
          signals: telemetry.status(),
        }
      },
    }
  }), [scene, camera])
  return null
}
