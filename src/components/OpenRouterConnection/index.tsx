import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import Branch from 'branch-component'
import {useState} from 'react'

import {notify, setApiKey, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function OpenRouterConnection({params, setParams}: ReturnType<typeof useGalleryAI>) {
  const apiKey = useGallery(s => s.apiKey)
  const [key, setKey] = useState(apiKey)
  return <section className={css.container} aria-labelledby='openrouter-title' data-testid='connection'>
    <h2 id='openrouter-title'>OpenRouter <span>{apiKey ? params.ai ? 'Enabled' : 'Disabled' : 'Not connected'}</span></h2>
    <p>Optional AI for artwork titles, stories and fusions. Images and text are sent to OpenRouter and may incur charges. No key is needed to explore.</p>
    <form
      onSubmit={event => {
        event.preventDefault()
        if (!key.trim()) {
          return
        }
        setApiKey(key.trim())
        setParams({ai: true})
        notify('OpenRouter key saved for this tab. AI is enabled.')
      }}
    >
      <label htmlFor='settings-key'>API key</label>
      <div className={css.keyRow}><input id='settings-key' autoComplete='off' placeholder='sk-or-…' spellCheck={false} type='password' value={key} onChange={event => setKey(event.target.value)} /><button className={css.primaryButton} disabled={!key.trim()}>{apiKey ? 'Update' : 'Connect'}</button></div>
    </form>
    <p className={css.note}>Your key stays in this tab and is never included in backups. Saving a key does not verify it or make a paid request.</p>
    <Branch if={apiKey}><div>
      <label className={css.toggleRow}>Enable AI<input checked={params.ai} type='checkbox' onChange={event => setParams({ai: event.target.checked})} /></label>
      <button
        className={css.textButton} onClick={() => {
          setApiKey('')
          setKey('')
          setParams({ai: false})
          notify('Key removed. AI is off.')
        }}
      >Disconnect & forget key</button>
    </div></Branch>
  </section>
}
