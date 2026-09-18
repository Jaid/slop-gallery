import type {NarrationState} from 'use-narrator/core'

import {useEffect, useRef} from 'react'

import {narrationBands, narrationMeter} from '#src/lib/audio/NarrationMeter.ts'

import css from './style.module.sass'

const idleBarStyle = {transform: 'scaleY(0.03)'}
const lingerEasing = 'cubic-bezier(0.55, 0, 1, 0.45)'

type Props = Pick<NarrationState, 'instanceId' | 'status' | 'statusEndsAt'>

export default function NarrationBars({instanceId, status, statusEndsAt}: Props) {
  const container = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const bars = [...container.current!.children] as Array<HTMLElement>
    if (status === 'after') {
      const now = performance.now() / 1000
      const duration = Math.max(0, ((statusEndsAt ?? now) - now) * 1000)
      const animations = bars.map(bar => bar.animate([
        {transform: getComputedStyle(bar).transform},
        {transform: 'scaleY(0)'},
      ], {
        duration,
        easing: lingerEasing,
        fill: 'forwards',
      }))
      return () => {
        for (const animation of animations) {
          animation.cancel()
        }
      }
    }
    if (status !== 'playing') {
      return
    }
    let frame = 0
    let last = -Infinity
    const reset = () => {
      for (const bar of bars) {
        bar.style.transform = 'scaleY(0.15)'
      }
    }
    const update = (time: number) => {
      if (time - last >= 80) {
        last = time
        const levels = narrationMeter.read(instanceId)
        for (const [i, bar] of bars.entries()) {
          bar.style.transform = `scaleY(${Math.max(0.15, Math.min(1, levels[i] * 2.4))})`
        }
      }
      frame = requestAnimationFrame(update)
    }
    reset()
    frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [instanceId, status, statusEndsAt])
  const idle = status === 'before' || status === 'preparing'
  return <span aria-hidden='true' className={css.container} data-testid='audio-bars' ref={container}>{narrationBands.map(([minimum]) => <i key={minimum} style={idle ? idleBarStyle : undefined} />)}</span>
}
