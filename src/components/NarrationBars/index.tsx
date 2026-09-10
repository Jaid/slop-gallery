import {useEffect, useRef} from 'react'

import {narrationBands, narrationMeter} from '#src/lib/audio/NarrationMeter.ts'

import css from './style.module.sass'

export default function NarrationBars({status}: {status: 'playing' | 'preparing'}) {
  const container = useRef<HTMLSpanElement>(null)
  useEffect(() => {
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
        const levels = narrationMeter.read()
        for (const [i, bar] of bars.entries()) {
          bar.style.transform = `scaleY(${Math.max(0.15, Math.min(1, levels[i] * 2.4))})`
        }
      }
      frame = requestAnimationFrame(update)
    }
    reset()
    if (status === 'playing') {
      frame = requestAnimationFrame(update)
    }
    return () => {
      cancelAnimationFrame(frame)
      reset()
    }
  }, [status])
  return <span ref={container} className={css.container} data-status={status} data-testid="audio-bars" aria-hidden="true">{narrationBands.map(([minimum]) => <i key={minimum}/>)}</span>
}
