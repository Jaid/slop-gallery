import {useState} from 'react'

import {resetGallery, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function ResetGallery() {
  const available = useGallery(s => s.hasControlled && s.ready && s.saveStatus !== 'loading')
  const [confirming, setConfirming] = useState(false)
  if (!available) {
    return null
  }
  return <div className={css.container} data-testid="menu-reset">
    {confirming ? <div className={css.confirmation}>
      <p>Restore the original art and sculptures and return to the entrance? Collection changes can be undone; physics positions cannot.</p>
      <button className={css.resetButton} onClick={() => {
        resetGallery()
        setConfirming(false)
      }}>Confirm reset</button>
      <button className={css.textButton} onClick={() => setConfirming(false)}>Cancel</button>
    </div> : <button className={css.textButton} onClick={() => setConfirming(true)}>Reset gallery</button>}
  </div>
}
