import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import {useEffect, useRef} from 'react'

import Icon from '#component/Icon'
import MenuNarration from '#component/MenuNarration'
import MenuOptions from '#component/MenuOptions'
import Minimap from '#component/Minimap'
import OpenRouterConnection from '#component/OpenRouterConnection'
import {enterGallery, startNewGame, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function Menu(settings: ReturnType<typeof useGalleryAI>) {
  const s = useGallery()
  const stage = s.menuStage
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({preventScroll: true})
  }, [])
  return <section className={css.container} data-testid="menu-overlay" data-stage={stage} aria-labelledby="menu-title">
    <div className={css.content}>
      <h1 ref={heading} id="menu-title" tabIndex={-1}>Slop Gallery</h1>
      {stage !== 'unfocus' && <p className={css.tagline}>Good taste. Questionable art.</p>}
      <button className={css.enter} id="enter-gallery" disabled={!s.ready} onClick={enterGallery}>{!s.ready ? 'Opening the gallery…' : stage === 'first' ? 'Enter gallery' : stage === 'return' ? 'Continue' : 'Resume'}<Icon name="arrow" size={18}/></button>
      {stage === 'return' && <button className={css.newGame} disabled={!s.ready} onClick={startNewGame}>New game</button>}
      {stage === 'pause' && <Minimap/>}
      {stage !== 'unfocus' && <>
        <MenuOptions/>
        <OpenRouterConnection {...settings}/>
        <MenuNarration/>
      </>}
    </div>
  </section>
}
