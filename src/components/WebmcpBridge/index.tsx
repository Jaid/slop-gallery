import {useThree} from '@react-three/fiber'
import {AimInspector} from 'ego-player'
import {useEffect} from 'react'

import dumpKnots from '#level/webmcp.ts'
import downloadFrame from '#src/lib/downloadFrame.ts'
import {usePortraitSlots} from '#src/lib/gallery/portraitSlotStore.ts'
import {galleryLevel} from '#src/lib/level.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'
import {playerDumps, snapshotPlayerDump} from '#src/lib/telemetry/recordPlayerDump.ts'
import registerWebmcp from '#src/lib/webmcp/register.ts'

export default function WebmcpBridge() {
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  useEffect(() => {
    const controller = new AbortController
    const inspector = new AimInspector(scene, camera)
    const bridge = {
      downloadFrame: async (name?: string) => {
        // Dump first, like X: the frame then shows the pose the dump describes.
        const capture = playerDumps.capture?.()
        const dump = capture ? snapshotPlayerDump(capture) : null
        const download = await downloadFrame(name ?? (dump ? `${galleryLevel}-${dump.id}` : undefined))
        return {
          ...download,
          dump,
        }
      },
      getAim: () => inspector.getAim(),
      getKnots: dumpKnots,
      getPortraitSlots: () => usePortraitSlots.getState().slots,
      getTelemetry: () => {
        if (!telemetry) {
          return null
        }
        return {
          sessionId: telemetry.sessionId,
          collection: telemetry.collectionStatus(),
          delivery: telemetry.status(),
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
