import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import {useEffect, useRef} from 'react'

import Icon from '#component/Icon'
import MenuNarration from '#component/MenuNarration'
import MenuOptions from '#component/MenuOptions'
import OpenRouterConnection from '#component/OpenRouterConnection'
import ResetGallery from '#component/ResetGallery'
import {enterGallery, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function Menu(settings: ReturnType<typeof useGalleryAI>) {
  const s = useGallery()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({preventScroll: true})
  }, [])
  return <section className={css.container} data-testid="menu-overlay" aria-labelledby="menu-title">
    <div className={css.content}>
      <h1 ref={heading} id="menu-title" tabIndex={-1}>Slop Gallery</h1>
      <p className={css.tagline}>Good taste. Questionable art.</p>
      <button className={css.enter} id="enter-gallery" disabled={!s.ready} onClick={enterGallery}>{!s.ready ? 'Opening the gallery…' : (s.hasControlled ? 'Resume' : 'Enter gallery')}<Icon name="arrow" size={18}/></button>
      <MenuOptions/>
      <OpenRouterConnection {...settings}/>
      <ResetGallery/>
      <MenuNarration/>
    </div>
  </section>
}
