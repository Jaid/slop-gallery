import BranchComponent from 'branch-component'
import useGraphicsQuality, {useSetGraphicsQuality} from 'use-graphics-quality'

import Icon from '#component/Icon'
import {useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function MenuOptions() {
  const s = useGallery()
  const isQuality = useGraphicsQuality()
  const setIsQuality = useSetGraphicsQuality()
  return <div className={css.container}>
    <button aria-label='Mute audio' aria-pressed={!s.sound} className={css.option} onClick={() => useGallery.setState({sound: !s.sound})}><Icon name={s.sound ? 'sound' : 'mute'} size={18} /><span>Audio</span><small><BranchComponent else='Muted' if={s.sound}>On</BranchComponent></small></button>
    <button aria-label='Performance graphics' aria-pressed={!isQuality} className={css.option} onClick={() => setIsQuality(!isQuality)}><Icon name='settings' size={18} /><span>Graphics</span><small><BranchComponent else='Performance' if={isQuality}>Quality</BranchComponent></small></button>
  </div>
}
