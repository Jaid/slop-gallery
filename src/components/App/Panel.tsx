import type {ReactNode} from 'react'

import {useEffect, useRef} from 'react'

import {openPanel, useGallery} from '#src/lib/gallery.ts'

import Icon from './Icon.tsx'

export default function Panel({title, children}: {children: ReactNode
  title: string}) {
  const ref = useRef<HTMLDialogElement>(null)
  const panel = useGallery(s => s.panel)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => {
      ref.current?.close()
      previous?.focus()
    }
  }, [])
  return <dialog ref={ref} className="panel-dialog" aria-labelledby="panel-title" onCancel={event => {
    event.preventDefault()
    openPanel(null)
  }} onClick={event => {
    if (event.target === ref.current) {
      openPanel(null)
    }
  }}>
    <section className={`panel ${panel === 'collection' ? 'collection-panel' : ''}`}>
      <div className="panel-heading"><div><div className="eyebrow">THE SLOP GALLERY</div><h2 id="panel-title">{title}</h2></div><button className="icon-button" aria-label="Close panel" onClick={() => openPanel(null)} autoFocus><Icon name="close"/></button></div>
      {children}
    </section>
  </dialog>
}
