import type useGalleryAI from '#src/lib/useGalleryAI.ts'

import {useState} from 'react'

import {notify, setApiKey, useGallery} from '#src/lib/gallery.ts'

export default function OpenRouterConnection({params, setParams}: ReturnType<typeof useGalleryAI>) {
  const apiKey = useGallery(s => s.apiKey)
  const [key, setKey] = useState(apiKey)
  return <details className="connection">
    <summary>OpenRouter <span>{apiKey ? params.ai ? 'Enabled' : 'Disabled' : 'Not connected'}</span></summary>
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
      <div className="key-row"><input id="settings-key" type="password" autoComplete="off" spellCheck={false} placeholder="sk-or-…" value={key} onChange={event => setKey(event.target.value)}/><button className="primary-button" disabled={!key.trim()}>{apiKey ? 'Update' : 'Connect'}</button></div>
    </form>
    <p className="connection-note">Your key stays in this tab and is never included in backups. Saving a key does not verify it or make a paid request.</p>
    {apiKey && <div className="connection-actions">
      <label className="toggle-row">Enable AI<input type="checkbox" checked={params.ai} onChange={event => void setParams({ai: event.target.checked}).catch(() => notify('AI preferences could not be saved.'))}/></label>
      <button className="text-button" onClick={() => {
        setApiKey('')
        setKey('')
        void setParams({ai: false}).catch(() => notify('AI preferences could not be saved.'))
        notify('Key removed. AI is off.')
      }}>Disconnect & forget key</button>
    </div>}
    <details><summary>Model preferences</summary>{(['text_model', 'image_model', 'audio_model', 'narrator_voice', 'narrator_character', 'text_model_effort'] as const).map(parameter => <label className="model-field" key={parameter}>{parameter.replaceAll('_', ' ')}<input value={params[parameter]} onChange={event => void setParams({[parameter]: event.target.value}).catch(() => notify('AI preferences could not be saved.'))}/></label>)}<label className="toggle-row">Prepare custom narration in advance<input type="checkbox" checked={params.eager_audio} onChange={event => void setParams({eager_audio: event.target.checked}).catch(() => notify('AI preferences could not be saved.'))}/></label><p>Changing AI settings cancels active jobs without consuming their source artworks. Recorded stories keep their original voice.</p></details>
  </details>
}
