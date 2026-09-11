import {useThree} from '@react-three/fiber/webgpu'
import {AimInspector} from 'ego-player'
import {useEffect} from 'react'

import {telemetry} from '#src/lib/telemetry/index.ts'
import registerWebmcp from '#src/lib/webmcp/register.ts'

export default function WebmcpBridge() {
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  useEffect(() => {
    const controller = new AbortController
    const inspector = new AimInspector(scene, camera)
    const bridge = {
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
    let unregister = () => {}
    async function register() {
      try {
        const cleanup = await registerWebmcp(() => bridge, controller.signal)
        if (controller.signal.aborted) {
          cleanup()
        } else {
          unregister = cleanup
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Could not register gallery WebMCP tools:', error)
        }
      }
    }
    // eslint-disable-next-line typescript/no-floating-promises -- Registration handles errors internally; effects cannot await it.
    void register()
    return () => {
      controller.abort()
      unregister()
    }
  }, [scene, camera])
  return null
}
