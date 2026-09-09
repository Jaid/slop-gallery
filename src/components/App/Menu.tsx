import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import {useEffect, useRef} from 'react'
import {useGraphicsQuality, useSetGraphicsQuality} from 'use-graphics-quality'

import {intro} from '#src/lib/audio/Narrator.ts'
import {enterGallery, openPanel, stopNarration, useGallery} from '#src/lib/gallery.ts'

import Icon from './Icon.tsx'
import NarrationActivity from './NarrationActivity.tsx'
import OpenRouterConnection from './OpenRouterConnection.tsx'
import ResetGallery from './ResetGallery.tsx'

export default function Menu(settings: ReturnType<typeof useGalleryAI>) {
  const s = useGallery()
  const isQuality = useGraphicsQuality()
  const setIsQuality = useSetGraphicsQuality()
  const heading = useRef<HTMLHeadingElement>(null)
  const speaking = s.narration?.id === '__intro' ? intro : s.portraits.find(p => p.id === s.narration?.id)
  useEffect(() => {
    heading.current?.focus({preventScroll: true})
  }, [])
  return <section className="menu-overlay" aria-labelledby="menu-title">
    <div className="menu">
      <h1 ref={heading} id="menu-title" tabIndex={-1}>Slop Gallery</h1>
      <p className="menu-tagline">Good taste. Questionable art.</p>
      <button className="menu-enter" id="enter-gallery" disabled={!s.ready} onClick={enterGallery}>{!s.ready ? 'Opening the gallery…' : s.hasControlled ? 'Resume' : 'Enter gallery'}<Icon name="arrow" size={18}/></button>
      <div className="menu-options">
        <button className="menu-option" aria-label="Mute audio" aria-pressed={!s.sound} onClick={() => useGallery.setState({sound: !s.sound})}><Icon name={s.sound ? 'sound' : 'mute'} size={18}/><span>Audio</span><small>{s.sound ? 'On' : 'Muted'}</small></button>
        <button className="menu-option" aria-label="Performance graphics" aria-pressed={!isQuality} onClick={() => setIsQuality(!isQuality)}><Icon name="settings" size={18}/><span>Graphics</span><small>{isQuality ? 'Quality' : 'Performance'}</small></button>
      </div>
      <OpenRouterConnection {...settings}/>
      <nav className="menu-links" aria-label="Gallery tools">
        <button aria-label="Open collection" onClick={() => openPanel('collection')}>Collection</button>
        <button onClick={() => openPanel('help')}>Controls</button>
        <button aria-label="Gallery settings" onClick={() => openPanel('settings')}>Preferences & backups</button>
      </nav>
      <ResetGallery/>
      {s.narration && speaking && <details className="menu-narration">
        <summary><NarrationActivity status={s.narration.status} source={s.narration.source}/>{speaking.title}</summary>
        <p>{speaking.description}</p>
        <button className="text-button" onClick={stopNarration}>Stop narration</button>
      </details>}
      <p className="menu-hint">WASD to move · Mouse to look · Esc for menu</p>
    </div>
  </section>
}
