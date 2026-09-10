import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import {useState} from 'react'

import {notify, setApiKey, useGallery} from '#src/lib/gallery.ts'

import css from './style.module.sass'

export default function OpenRouterConnection({params, setParams}: ReturnType<typeof useGalleryAI>) {
  const apiKey = useGallery(s => s.apiKey)
  const [key, setKey] = useState(apiKey)
  return <section className={css.container} data-testid="connection" aria-labelledby="openrouter-title">
    <h2 id="openrouter-title">OpenRouter <span>{apiKey ? params.ai ? 'Enabled' : 'Disabled' : 'Not connected'}</span></h2>
    <p>Optional AI for artwork titles, stories and fusions. Images and text are sent to OpenRouter and may incur charges. No key is needed to explore.</p>
    <form onSubmit={event => {
      event.preventDefault()
      if (!key.trim()) {
        return
      }
      setApiKey(key.trim())
      void setParams({ai: true}).catch(() => notify('AI preferences could not be saved.'))
      notify('OpenRouter key saved for this tab. AI is enabled.')
    }}>
      <label htmlFor="settings-key">API key</label>
      <div className={css.keyRow}><input id="settings-key" type="password" autoComplete="off" spellCheck={false} placeholder="sk-or-…" value={key} onChange={event => setKey(event.target.value)}/><button className={css.primaryButton} disabled={!key.trim()}>{apiKey ? 'Update' : 'Connect'}</button></div>
    </form>
    <p className={css.note}>Your key stays in this tab and is never included in backups. Saving a key does not verify it or make a paid request.</p>
    {apiKey && <div>
      <label className={css.toggleRow}>Enable AI<input type="checkbox" checked={params.ai} onChange={event => void setParams({ai: event.target.checked}).catch(() => notify('AI preferences could not be saved.'))}/></label>
      <button className={css.textButton} onClick={() => {
        setApiKey('')
        setKey('')
        void setParams({ai: false}).catch(() => notify('AI preferences could not be saved.'))
        notify('Key removed. AI is off.')
      }}>Disconnect & forget key</button>
    </div>}
  </section>
}
