import type {NarrationState} from 'use-narrator/core'

import {useEffect, useRef} from 'react'

import {narrationBands, narrationMeter} from '#src/lib/audio/NarrationMeter.ts'

import css from './style.module.sass'

const idleBarStyle = {transform: 'scaleY(0.03)'}

type Props = Pick<NarrationState, 'instanceId' | 'status' | 'statusEndsAt'>

export function lingerBarScale(startScale: number, progress: number) {
  const clamped = Math.max(0, Math.min(1, progress))
  return startScale * (1 - clamped ** 3)
}

export default function NarrationBars({instanceId, status, statusEndsAt}: Props) {
  const container = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const bars = [...container.current!.children] as Array<HTMLElement>
    if (status === 'after') {
      const startedAt = performance.now() / 1000
      const endsAt = Math.max(startedAt, statusEndsAt ?? startedAt)
      const duration = endsAt - startedAt
      const startScales = bars.map(bar => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(bar).transform)
        return matrix.m22
      })
      for (const [index, bar] of bars.entries()) {
        bar.style.transition = 'none'
        bar.style.transform = `scaleY(${startScales[index]})`
      }
      let frame = 0
      const update = (time: number) => {
        const progress = duration ? (time / 1000 - startedAt) / duration : 1
        for (const [index, bar] of bars.entries()) {
          bar.style.transform = `scaleY(${lingerBarScale(startScales[index], progress)})`
        }
        if (progress < 1) {
          frame = requestAnimationFrame(update)
        }
      }
      frame = requestAnimationFrame(update)
      return () => {
        cancelAnimationFrame(frame)
        for (const bar of bars) {
          bar.style.transition = ''
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
