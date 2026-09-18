import type {NarrationState} from 'use-narrator/core'

import {useEffect, useRef} from 'react'

import NarrationActivity from '#component/NarrationActivity'

import css from './style.module.sass'

type Props = Pick<NarrationState, 'instanceId' | 'source' | 'status' | 'statusEndsAt' | 'title'>

export function lingerOpacity(progress: number) {
  return 1 - Math.max(0, Math.min(1, progress))
}

export default function NarrationIndicator({instanceId, title, status, statusEndsAt, source}: Props) {
  const container = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = container.current!
    if (status !== 'after') {
      element.style.opacity = '1'
      return
    }
    const startedAt = performance.now() / 1000
    const endsAt = Math.max(startedAt, statusEndsAt ?? startedAt)
    const duration = endsAt - startedAt
    let frame = 0
    const update = (time: number) => {
      const progress = duration ? (time / 1000 - startedAt) / duration : 1
      element.style.opacity = String(lingerOpacity(progress))
      if (progress < 1) {
        frame = requestAnimationFrame(update)
      }
    }
    frame = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [status, statusEndsAt])
  return <aside aria-label='Audio guide' className={css.container} ref={container}>
    <NarrationActivity instanceId={instanceId} source={source} status={status} statusEndsAt={statusEndsAt} />
    <div role='status'><small>Narrator</small><span title={title}>{title}</span></div>
  </aside>
}

export function NarrationIndicatorStack({narrations}: {narrations: ReadonlyArray<NarrationState>}) {
  if (!narrations.length) {
    return null
  }
  return <div className={css.stack} data-testid='narration-stack'>
    {narrations.map(narration => <NarrationIndicator instanceId={narration.instanceId} key={narration.instanceId} source={narration.source} status={narration.status} statusEndsAt={narration.statusEndsAt} title={narration.title} />)}
  </div>
}
