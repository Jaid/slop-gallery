import type PortraitFrame from '#src/lib/frames/base/PortraitFrame.ts'
import type {Portrait} from '#src/lib/gallery.ts'
import type {Group} from 'three/webgpu'

import {useFrame} from '@react-three/fiber'
import {useEffect, useRef} from 'react'

import hangingVoices from '#src/lib/audio/hangingVoices.ts'
import {playSound} from '#src/lib/gallery.ts'
import HangingRun from '#src/lib/gallery/hanging/HangingRun.ts'
import {takeHanging} from '#src/lib/gallery/hanging/hangings.ts'
import world from '#src/worlds/current.ts'

/** how far in front of the wall the floor under a work is looked up, so its dust settles on the room’s floor, not on whatever lies behind the wall */
const floorProbe = 0.3

/**
 * Plays a work’s arrival on its wall once it was asked for and the work hangs there, moving its frame `art` and its `placard`, while its body already hangs still, and sounds it from where it hangs.
 * Anything taking the work off the wall, picking it up or fusing it ends the arrival at once.
 */
export default function useHanging(portrait: Portrait, frame: PortraitFrame, held: boolean, art: {current: Group | null}, placard: {current: Group | null}) {
  const run = useRef<HangingRun>(null)
  useEffect(() => () => {
    run.current?.settle(art.current, placard.current)
    run.current = null
  }, [art, placard])
  useFrame((_, delta) => {
    const still = portrait.hung && !held && !portrait.reserved && !portrait.fusing
    const request = takeHanging(portrait.id, portrait.position, portrait.rotation)
    if (request && still) {
      run.current?.settle(art.current, placard.current)
      const [x, y, z] = portrait.position
      run.current = new HangingRun(request, {
        floor: world.placement.floorHeight([x + Math.sin(portrait.rotation) * floorProbe, y, z + Math.cos(portrait.rotation) * floorProbe]),
        front: frame.front,
        height: portrait.height,
        reach: frame.reach,
        width: portrait.width,
      })
      playSound(hangingVoices({
        impact: request.animation.impact,
        sound: frame.impactSound,
        variation: request.seed / 2 ** 31 - 1,
      }), `hanging:${request.seed}`, portrait.position)
    }
    const current = run.current
    if (!current) {
      return
    }
    if (!still) {
      current.settle(art.current, placard.current)
      run.current = null
      return
    }
    if (!current.update(delta, art.current, placard.current)) {
      run.current = null
    }
  })
}
