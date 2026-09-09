import {useState} from 'react'

import {resetGallery, useGallery} from '#src/lib/gallery.ts'

export default function ResetGallery() {
  const available = useGallery(s => s.hasControlled && s.ready && s.saveStatus !== 'loading')
  const [confirming, setConfirming] = useState(false)
  if (!available) {
    return null
  }
  return <div className="menu-reset">
    {confirming ? <div className="reset-confirmation">
      <p>Restore the original art and sculptures and return to the entrance? Collection changes can be undone; physics positions cannot.</p>
      <button className="reset-button" onClick={() => {
        resetGallery()
        setConfirming(false)
      }}>Confirm reset</button>
      <button className="text-button" onClick={() => setConfirming(false)}>Cancel</button>
    </div> : <button className="text-button" onClick={() => setConfirming(true)}>Reset gallery</button>}
  </div>
}
