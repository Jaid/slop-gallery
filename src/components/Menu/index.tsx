import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import Branch from 'branch-component'
import {useEffect, useRef} from 'react'
import usePauseMenu from 'use-pause-menu'

import Icon from '#component/Icon'
import MenuNarration from '#component/MenuNarration'
import MenuOptions from '#component/MenuOptions'
import Minimap from '#component/Minimap'
import OpenRouterConnection from '#component/OpenRouterConnection'
import {enterGallery, rooms, startNewGame, useGallery} from '#src/lib/gallery.ts'
import {galleryEnterLabel, gallerySupportsMap, galleryTagline, galleryTitle, isGallery} from '#src/lib/level.ts'
import pauseMenu from '#src/lib/pauseMenu.ts'

import css from './style.module.sass'

export default function Menu(settings: ReturnType<typeof useGalleryAI>) {
  const s = useGallery()
  const {stage} = usePauseMenu(pauseMenu)
  const room = rooms.find(room => room.id === s.room)!
  const tagline = isGallery && stage === 'pause' ? room.floorY < 0 ? 'lower floor room' : 'upper floor room' : galleryTagline
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({preventScroll: true})
  }, [])
  return <section className={css.container} data-testid="menu-overlay" data-stage={stage} aria-labelledby="menu-title">
    <div className={css.layout}>
      <Branch all={[stage === 'pause', gallerySupportsMap]}><Minimap lower={false}/></Branch>
      <div className={css.content}>
        <h1 ref={heading} id="menu-title" tabIndex={-1}><Branch all={[stage === 'pause', isGallery]} then={room.title} else={galleryTitle}/></h1>
        <Branch unless={stage === 'unfocus'}><p className={css.tagline}>{tagline}</p></Branch>
        <button className={css.enter} id="enter-gallery" disabled={!s.ready} onClick={enterGallery}>{!s.ready ? `Opening ${galleryTitle}…` : stage === 'reset' ? 'New game' : stage === 'first' ? galleryEnterLabel : stage === 'return' ? 'Continue' : 'Resume'}<Icon name="arrow" size={18}/></button>
        <Branch if={stage === 'return'}><button className={css.newGame} disabled={!s.ready} onClick={startNewGame}>New game</button></Branch>
        <Branch unless={stage === 'unfocus'}><>
          <MenuOptions/>
          <OpenRouterConnection {...settings}/>
          <MenuNarration/>
        </></Branch>
      </div>
      <Branch all={[stage === 'pause', gallerySupportsMap]}><Minimap lower/></Branch>
    </div>
  </section>
}
