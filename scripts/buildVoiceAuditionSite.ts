import {resolve} from 'node:path'

import {auditionTranscript, voiceAuditions} from './lib/knots/voiceAuditions.ts'

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Publishes only the selected audition audio and public descriptions, never the private generation cache. */
export default async function buildVoiceAuditionSite() {
  const root = resolve(import.meta.dir, '..')
  const output = resolve(root, 'private/voice-audition-drop')
  const assets = resolve(output, 'public')
  for (const voice of voiceAuditions) {
    const source = Bun.file(resolve(root, 'private/knot-voice-auditions', `${voice.id}.opus`))
    if (!await source.exists() || source.size === 0) {
      throw new Error(`Missing audition: ${voice.id}`)
    }
    await Bun.write(resolve(assets, `${voice.id}.opus`), source)
  }
  const cards = voiceAuditions.map((voice, index) => `<article id="voice-${index + 1}">
    <header><span class="number">${String(index + 1).padStart(2, '0')}</span><div><h2>${escape(voice.title)}</h2><p>${escape(voice.voice)}</p></div></header>
    <audio controls preload="none" aria-label="${escape(voice.title)}"><source src="./${voice.id}.opus" type="audio/ogg; codecs=opus"></audio>
    <details><summary>Character direction</summary><p>${escape(voice.character)}</p></details>
    <a class="download" href="./${voice.id}.opus" download>Save audio ↓</a>
  </article>`).join('\n')
  await Bun.write(resolve(assets, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#15121e">
<meta name="robots" content="noindex, nofollow">
<title>Knottingham · Voice auditions</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;color:#f4efff;background:#15121e;line-height:1.55}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top right,#382444,transparent 60%)}
main{max-width:960px;margin:auto;padding:40px 18px max(40px,env(safe-area-inset-bottom))}
.eyebrow{color:#d2abff;font-size:12px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}
h1{font-size:clamp(32px,7vw,54px);line-height:1.12;letter-spacing:-.045em;margin:16px 0}
.intro{max-width:600px;color:#c5bdcf}.intro strong{color:#fff}.transcript{border-left:2px solid #aa7fde;padding-left:16px;margin:24px 0 32px;color:#c5bdcf;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:16px}
article{background:#211b2be8;border:1px solid #493753;border-radius:20px;padding:20px;min-width:0}
article:has(audio[data-playing]){border-color:#d2abff;box-shadow:0 0 0 1px #d2abff}
header{display:flex;gap:15px;align-items:center;margin-bottom:20px}.number{font-size:28px;font-weight:750;color:#d2abff;font-variant-numeric:tabular-nums}
h2{font-size:20px;line-height:1.25;margin:0}header p{margin:4px 0 0;color:#b9aec8;font-size:13px}
audio{display:block;width:100%;height:54px}details{margin-top:16px;font-size:14px;color:#c5bdcf}summary{cursor:pointer;padding:10px 0;min-height:44px}details p{margin-top:0}
a{color:#dbc0ff}.download{display:inline-block;padding:10px 0;font-size:13px;min-height:44px}footer{margin-top:32px;color:#b9aec8;font-size:13px}
:focus-visible{outline:2px solid #e0c4ff;outline-offset:4px}
</style>
</head>
<body><main>
<div class="eyebrow">Knottingham · Casting room</div>
<h1>Ten voices.<br>One new narrator.</h1>
<p class="intro">Tap play and find your favorite. Starting another voice pauses the previous one. <strong>Tell me the number in our chat when you’ve picked.</strong></p>
<div class="transcript"><strong>Same five names in every audition</strong><br>${auditionTranscript.map(escape).join(' ')}</div>
<section class="grid" aria-label="Voice auditions">${cards}</section>
<footer>Anonymous, temporary Cloudflare preview · No login, analytics or external assets. Existing game narrations are unchanged.</footer>
</main>
<script type="module">
const players = [...document.querySelectorAll('audio')]
for (const player of players) {
  player.addEventListener('play', () => {
    for (const other of players) if (other !== player) other.pause()
    player.dataset.playing = ''
  })
  player.addEventListener('pause', () => delete player.dataset.playing)
  player.addEventListener('ended', () => delete player.dataset.playing)
}
</script>
</body></html>`)
  await Bun.write(resolve(assets, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n\n/*.opus\n  Content-Type: audio/ogg\n')
  await Bun.write(resolve(output, 'wrangler.json'), JSON.stringify({
    name: 'knottingham-voice-auditions',
    compatibility_date: '2026-09-11',
    assets: {directory: './public'},
  }, null, 2))
  return output
}

if (import.meta.main) {
  console.log(await buildVoiceAuditionSite())
}
