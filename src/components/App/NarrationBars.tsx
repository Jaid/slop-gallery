import {useEffect, useRef} from 'react'

import {narrationBands, narrationMeter} from '#src/lib/audio/NarrationMeter.ts'

export default function NarrationBars({status}: {status: 'preparing' | 'playing'}) {
  const container = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const bars = Array.from(container.current!.children) as HTMLElement[]
    let frame = 0
    let last = -Infinity
    const reset = () => bars.forEach(bar => {bar.style.transform = 'scaleY(0.15)'})
    const update = (time: number) => {
      if (time - last >= 80) {
        last = time
        const levels = narrationMeter.read()
        bars.forEach((bar, i) => {bar.style.transform = `scaleY(${Math.max(0.15, Math.min(1, levels[i]! * 2.4))})`})
      }
      frame = requestAnimationFrame(update)
    }
    reset()
    if (status === 'playing') frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
      reset()
    }
  }, [status])
  return <span ref={container} className={`audio-bars ${status}`} aria-hidden="true">{narrationBands.map(([minimum]) => <i key={minimum}/>)}</span>
}
