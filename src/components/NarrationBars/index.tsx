import {useEffect, useRef} from 'react'

import {narrationBands, narrationMeter} from '#src/lib/audio/NarrationMeter.ts'

import css from './style.module.sass'

const idleBarStyle = {transform: 'scaleY(0.03)'}

export default function NarrationBars({active = true, instanceId}: {
  active?: boolean
  instanceId: string
}) {
  const container = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!active) {
      return
    }
    const bars = [...container.current!.children] as Array<HTMLElement>
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
  }, [active, instanceId])
  return <span aria-hidden='true' className={css.container} data-testid='audio-bars' ref={container}>{narrationBands.map(([minimum]) => <i key={minimum} style={active ? undefined : idleBarStyle} />)}</span>
}
