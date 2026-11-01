import type {AudioProgress, NarrationState, NarrationTiming} from 'use-narrator/core'

import Branch from 'branch-component'
import {Fragment, useEffect, useRef, useState} from 'react'
import {estimateTiming, narrationCursor, narrationWords} from 'use-narrator/core'

import {narrator} from '#src/lib/audio/narration.ts'
import {easeFill, letterStarts, subtitleGroupAt, subtitleGroups, subtitleWordState} from '#src/lib/audio/subtitles.ts'

import css from './style.module.sass'

/** Seconds a sentence comes up before its first word is spoken, so reading starts with the voice. */
const lead = 0.2

type Props = {
  narration: Pick<NarrationState, 'instanceId' | 'status' | 'timing'> & {text: string}
  /** where playback stands, read every frame; the app narrator’s progress of `narration` by default, a scrubbable source in previews */
  progress?: () => AudioProgress | undefined
}

/**
 * The narration’s text, one sentence (or a run of short ones) at a time. Spoken words turn yellow: letter by letter with character timings, otherwise the current word fills from left to right. The current word is scaled up without moving the others.
 * Reads the playback position every frame and paints the words directly, so React only renders when the sentence changes.
 */
export default function NarrationSubtitles({narration: {instanceId, status, text, timing}, progress: readProgress}: Props) {
  const words = narrationWords(text)
  const groups = subtitleGroups(text, words)
  const letters = letterStarts(timing, text.length)
  const ended = status === 'after'
  const container = useRef<HTMLElement>(null)
  const shownRef = useRef(0)
  const [shown, setShown] = useState(0)
  const [leaving, setLeaving] = useState<number>()
  useEffect(() => {
    let frame = 0
    // Audio without a timing still gets paced subtitles, from an estimate over its duration.
    let estimate: NarrationTiming | undefined
    const paint = () => {
      frame = requestAnimationFrame(paint)
      const element = container.current
      if (!element) {
        return
      }
      const progress = readProgress ? readProgress() : narrator.progress(instanceId)
      const timeline = progress !== undefined && 'seconds' in progress
      if (!timing && timeline && progress.duration && !estimate) {
        estimate = estimateTiming(text, progress.duration)
      }
      const used = timing ?? estimate
      const cursor = narrationCursor(words, progress, used)
      const ahead = timeline ? narrationCursor(words, {
        ...progress,
        seconds: progress.seconds + lead,
      }, used) : cursor
      const group = ended ? groups.length - 1 : subtitleGroupAt(groups, ahead.word)
      if (group !== shownRef.current) {
        setLeaving(shownRef.current)
        shownRef.current = group
        setShown(group)
      }
      element.dataset.timeline = String(timeline)
      for (const word of element.querySelectorAll<HTMLElement>('[data-group="leaving"] [data-word]')) {
        word.dataset.state = 'spoken'
      }
      for (const word of element.querySelectorAll<HTMLElement>('[data-group="current"] [data-word]')) {
        const index = Number(word.dataset.word)
        const state = subtitleWordState(index, cursor, used, ended)
        if (word.dataset.state !== state) {
          word.dataset.state = state
        }
        if (state !== 'current') {
          continue
        }
        const fill = word.querySelector<HTMLElement>('[data-fill]')
        if (fill) {
          fill.style.clipPath = `inset(0 ${((1 - easeFill(cursor.progress)) * 100).toFixed(2)}% 0 0)`
        }
        if (letters && cursor.seconds !== undefined) {
          for (const letter of word.querySelectorAll<HTMLElement>('[data-letter]')) {
            letter.toggleAttribute('data-spoken', letters[Number(letter.dataset.letter)] <= cursor.seconds)
          }
        }
      }
    }
    paint()
    return () => cancelAnimationFrame(frame)
  }, [ended, groups, instanceId, letters, readProgress, text, timing, words])
  const renderGroup = (index: number, role: 'current' | 'leaving') => {
    const group = groups[index]
    return <p
      key={index}
      className={css.group}
      data-group={role}
      onAnimationEnd={event => {
        if (role === 'leaving' && event.target === event.currentTarget) {
          setLeaving(undefined)
        }
      }}
    >
      {words.slice(group.first, group.last).map((word, order) => {
        const token = text.slice(word.from, word.to)
        let offset = word.from
        const lettered = letters && Array.from(token, character => {
          const at = offset
          offset += character.length
          return <span key={at} className={css.letter} data-letter={at}>{character}</span>
        })
        return <Fragment key={word.from}>
          {order ? ' ' : null}
          <span className={css.word} data-word={group.first + order} style={{animationDelay: `${order * 24}ms`}}>
            <Branch if={letters} then={lettered} else={<>{token}<span className={css.fill} aria-hidden='true' data-fill>{token}</span></>} />
          </span>
        </Fragment>
      })}
    </p>
  }
  return <section className={css.container} aria-label='Subtitles' data-ended={ended} data-letters={Boolean(letters)} data-testid='narration-subtitles' ref={container}>
    {leaving !== undefined && leaving !== shown ? renderGroup(leaving, 'leaving') : null}
    {renderGroup(shown, 'current')}
  </section>
}
