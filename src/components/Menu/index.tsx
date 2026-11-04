import type useGalleryAI from '#src/lib/useGalleryAI.ts'
import type {PauseMenuStage} from 'use-pause-menu'

import Branch from 'branch-component'
import clsx from 'clsx'
import {useEffect, useRef} from 'react'
import usePauseMenu from 'use-pause-menu'

import Icon from '#component/Icon'
import MenuNarration from '#component/MenuNarration'
import MenuOptions from '#component/MenuOptions'
import Minimap from '#component/Minimap'
import OpenRouterConnection from '#component/OpenRouterConnection'
import icon from '#root/assets/icon.svg'
import {enterGallery, useGallery} from '#src/lib/gallery.ts'
import {useIntro} from '#src/lib/gallery/intro.ts'
import {startNewGame} from '#src/lib/gameSeed.ts'
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
  // Until the player first enters, the menu leaves the intro in full view: the title above it, the buttons below.
  const intro = useIntro(state => state.orbit !== null) && (stage === 'first' || stage === 'return')
  useEffect(() => {
    heading.current?.focus({preventScroll: true})
  }, [])
  if (intro) {
    const [titleStart, ...titleRest] = world.title.split(' ')
    return <section className={clsx(css.container, css.intro)} aria-labelledby='menu-title' data-stage={stage} data-testid='menu-overlay'>
      {/* The icon between the title’s first word and the rest */}
      <h1 id='menu-title' className={css.title} tabIndex={-1} ref={heading}>{titleStart} <img className={css.logo} alt='' height={128} src={icon} width={128} /> {titleRest.join(' ')}</h1>
      <div className={css.actions}>
        <div className={css.play}>
          <button id='enter-gallery' className={css.enter} disabled={!s.ready} type='button' onClick={enterGallery}>{s.ready ? 'Play' : enterButtonLabel(false, stage)}<Icon name='arrow' size={18} /></button>
          <Branch if={stage === 'return'}><button className={css.newGame} disabled={!s.ready} type='button' onClick={startNewGame}>New game</button></Branch>
        </div>
        <MenuOptions className={css.options} />
      </div>
    </section>
  }
  return <section className={css.container} aria-labelledby='menu-title' data-stage={stage} data-testid='menu-overlay'>
    <div className={css.layout}>
      <Branch if={paused}><Minimap lower={false} /></Branch>
      <div className={css.content}>
        <h1 id='menu-title' tabIndex={-1} ref={heading}><Branch if={paused} then={room.title} else={world.title} /></h1>
        <Branch not={stage === 'unfocus'}><p className={css.tagline}>{tagline}</p></Branch>
        <button id='enter-gallery' className={css.enter} disabled={!s.ready} type='button' onClick={stage === 'reset' ? startNewGame : enterGallery}>{enterButtonLabel(s.ready, stage)}<Icon name='arrow' size={18} /></button>
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
