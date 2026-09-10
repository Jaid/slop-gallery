import {useGraphicsQuality, useSetGraphicsQuality} from 'use-graphics-quality'

import Icon from '#component/Icon'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function MenuOptions() {
  const s = useGallery()
  const isQuality = useGraphicsQuality()
  const setIsQuality = useSetGraphicsQuality()
  return <div className={css.container}>
    <button className={css.option} aria-label="Mute audio" aria-pressed={!s.sound} onClick={() => useGallery.setState({sound: !s.sound})}><Icon name={s.sound ? 'sound' : 'mute'} size={18}/><span>Audio</span><small>{s.sound ? 'On' : 'Muted'}</small></button>
    <button className={css.option} aria-label="Performance graphics" aria-pressed={!isQuality} onClick={() => setIsQuality(!isQuality)}><Icon name="settings" size={18}/><span>Graphics</span><small>{isQuality ? 'Quality' : 'Performance'}</small></button>
  </div>
}
