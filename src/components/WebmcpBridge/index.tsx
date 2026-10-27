import type {FrameFormat} from '#src/lib/downloadFrame.ts'

import {useThree} from '@react-three/fiber'
import {applyWireframeFlood} from 'capture-session'
import {AimInspector} from 'ego-player'
import {useEffect} from 'react'

import dumpKnots, {worldRooms} from '#level/webmcp.ts'
import downloadFrame from '#src/lib/downloadFrame.ts'
import {usePortraitSlots} from '#src/lib/gallery/portraitSlotStore.ts'
import {galleryLevel} from '#src/lib/level.ts'
import {loadingItems} from '#src/lib/loadingItems.ts'
import {telemetry} from '#src/lib/telemetry/index.ts'
import {playerDumps, snapshotPlayerDump} from '#src/lib/telemetry/recordPlayerDump.ts'
import analyzeWorld from '#src/lib/webmcp/analyzeWorld.ts'
import registerWebmcp from '#src/lib/webmcp/register.ts'

export default function WebmcpBridge() {
  const scene = useThree(s => s.scene)
  const camera = useThree(s => s.camera)
  useEffect(() => {
    const controller = new AbortController
    const inspector = new AimInspector(scene, camera)
    const bridge = {
      analyzeWorld: () => analyzeWorld(scene, worldRooms),
      downloadFrame: async ({name, format}: {
        format?: FrameFormat
        name?: string
      }) => {
        // Dump first, like X: the frame then shows the pose the dump describes.
        const capture = playerDumps.capture?.()
        const dump = capture ? snapshotPlayerDump(capture) : null
        const download = await downloadFrame({
          name: name ?? (dump ? `${galleryLevel}-${dump.id}` : undefined),
          format,
        })
        return {
          ...download,
          dump,
        }
      },
      getAim: () => inspector.getAim(),
      getKnots: dumpKnots,
      getLoadingItems: loadingItems,
      getPortraitSlots: () => usePortraitSlots.getState().slots,
      setWireframe: applyWireframeFlood,
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
