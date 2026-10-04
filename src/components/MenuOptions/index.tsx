import useGraphicsMode, {useSetGraphicsMode} from 'use-graphics-mode'

import Icon from '#component/Icon'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function MenuOptions() {
  const s = useGallery()
  const isHeavy = useGraphicsMode()
  const setIsHeavy = useSetGraphicsMode()
  return <div className={css.container}>
    <button className={css.option} aria-label='Mute audio' aria-pressed={!s.sound} onClick={() => useGallery.setState({sound: !s.sound})}><Icon name={s.sound ? 'sound' : 'mute'} size={18} /><span>Audio</span><small>{s.sound ? 'On' : 'Muted'}</small></button>
    <button className={css.option} aria-label='Heavy graphics' aria-pressed={isHeavy} onClick={() => setIsHeavy(!isHeavy)}><Icon name='settings' size={18} /><span>Graphics</span><small>{isHeavy ? 'Heavy' : 'Fast'}</small></button>
  </div>
}
