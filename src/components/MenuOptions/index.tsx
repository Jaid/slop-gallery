import {useId} from 'react'
import useGraphicsMode, {useCinematicGraphics, useSetGraphicsMode} from 'use-graphics-mode'

import GraphicsHints from '#component/GraphicsHints'
import Icon from '#component/Icon'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function MenuOptions() {
  const s = useGallery()
  const isHeavy = useGraphicsMode()
  const setIsHeavy = useSetGraphicsMode()
  const isCinematic = useCinematicGraphics()
  const graphicsHintsId = useId()
  return <div className={css.container}>
    <button className={css.option} aria-label='Mute audio' aria-pressed={!s.sound} type='button' onClick={() => useGallery.setState({sound: !s.sound})}><Icon name={s.sound ? 'sound' : 'mute'} size={18} /><span>Audio</span><small>{s.sound ? 'On' : 'Muted'}</small></button>
    <button className={css.option} aria-label='Heavy graphics' aria-pressed={isHeavy} interestfor={graphicsHintsId} type='button' onClick={() => setIsHeavy(!isHeavy)}><Icon name='settings' size={18} /><span>Graphics</span><small>{isHeavy ? (isCinematic ? 'Cinematic' : 'Heavy') : 'Fast'}</small></button>
    <GraphicsHints id={graphicsHintsId} />
  </div>
}
