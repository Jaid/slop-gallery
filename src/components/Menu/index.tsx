import type useGalleryAI from '#src/lib/useGalleryAI.ts'
import type {PauseMenuStage} from 'use-pause-menu'

import Branch from 'branch-component'
import {useEffect, useRef} from 'react'
import usePauseMenu from 'use-pause-menu'

import Icon from '#component/Icon'
import MenuNarration from '#component/MenuNarration'
import MenuOptions from '#component/MenuOptions'
import Minimap from '#component/Minimap'
import OpenRouterConnection from '#component/OpenRouterConnection'
import {enterGallery, startNewGame, useGallery} from '#src/lib/gallery.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'
import world from '#src/worlds/current.ts'

import css from './style.module.sass'

export default function Menu(settings: ReturnType<typeof useGalleryAI>) {
  const s = useGallery()
  const {stage} = usePauseMenu(pauseMenu)
  const room = world.roomById(s.room) ?? world.room(world.defaultRoom)
  const paused = stage === 'pause'
  const tagline = paused ? world.roomTagline(room) : world.tagline
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({preventScroll: true})
  }, [])
  return <section className={css.container} aria-labelledby='menu-title' data-stage={stage} data-testid='menu-overlay'>
    <div className={css.layout}>
      <Branch if={paused}><Minimap lower={false} /></Branch>
      <div className={css.content}>
        <h1 id='menu-title' tabIndex={-1} ref={heading}><Branch if={paused} then={room.title} else={world.title} /></h1>
        <Branch not={stage === 'unfocus'}><p className={css.tagline}>{tagline}</p></Branch>
        <button id='enter-gallery' className={css.enter} disabled={!s.ready} type='button' onClick={enterGallery}>{enterButtonLabel(s.ready, stage)}<Icon name='arrow' size={18} /></button>
        <Branch if={stage === 'return'}><button className={css.newGame} disabled={!s.ready} type='button' onClick={startNewGame}>New game</button></Branch>
        <Branch not={stage === 'unfocus'}>
          <MenuOptions />
          <Branch if={settings.available}><OpenRouterConnection {...settings} /></Branch>
          <MenuNarration />
        </Branch>
      </div>
      <Branch if={paused}><Minimap lower /></Branch>
    </div>
  </section>
}

function enterButtonLabel(ready: boolean, stage: PauseMenuStage) {
  if (!ready) {
    return `Opening ${world.title}…`
  }
  if (stage === 'reset') {
    return 'New game'
  }
  if (stage === 'first') {
    return world.enterLabel
  }
  if (stage === 'return') {
    return 'Continue'
  }
  return 'Resume'
}
