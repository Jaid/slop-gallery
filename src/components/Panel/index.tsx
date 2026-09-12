import type {ReactNode} from 'react'

import Branch from 'branch-component'
import {useEffect, useRef} from 'react'

import Icon from '#component/Icon'
import Toast from '#component/Toast'
import {openPanel, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function Panel({title, children}: {children: ReactNode
  title: string}) {
  const ref = useRef<HTMLDialogElement>(null)
  const notice = useGallery(s => s.notice)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => {
      ref.current?.close()
      previous?.focus()
    }
  }, [])
  return <dialog ref={ref} className={css.container} aria-labelledby="panel-title" onCancel={event => {
    event.preventDefault()
    openPanel(null)
  }} onClick={event => {
    if (event.target === ref.current) {
      openPanel(null)
    }
  }}>
    <section className={css.content}>
      <div className={css.heading}><div><div className={css.eyebrow}>THE SLOP GALLERY</div><h2 id="panel-title">{title}</h2></div><button className={css.iconButton} aria-label="Close panel" onClick={() => openPanel(null)} autoFocus><Icon name="close"/></button></div>
      <Branch if={notice}><Toast panel>{notice}</Toast></Branch>
      {children}
    </section>
  </dialog>
}
