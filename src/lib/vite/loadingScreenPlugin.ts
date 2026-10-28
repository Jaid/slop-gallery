import type {Plugin} from 'vite'

import {resolve} from 'node:path'

import fs from 'fs-extra'
import {AvifCache} from 'vite-plugin-avif-only'

type LoadingScreen = {
  tagline: string
  title: string
  /** image behind the title, relative to the project root */
  wallpaper?: string
}

// Covers the scene and the menu until the scene is ready. The gradient keeps the title readable on bright wallpapers.
const style = `
#loading-screen {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  padding: 2rem 1rem;
  font-family: main, system-ui, sans-serif;
  color: #eee;
  text-align: center;
  text-shadow: 0 0 1rem #000;
  background: radial-gradient(rgb(0 0 0 / 50%), rgb(0 0 0 / 10%) 75%), #111 var(--wallpaper, none) center / cover no-repeat;
}
#loading-screen[aria-busy=false] {
  pointer-events: none;
}
#loading-screen > div {
  width: min(440px, 100%);
  margin: auto;
}
#loading-screen h1 {
  margin: 0;
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  font-weight: 400;
}
#loading-screen p {
  margin: 0.75rem 0 2rem;
  color: #ccc;
}
#loading-screen span {
  color: #e5cf87;
  animation: loading-screen 1.2s ease-in-out infinite alternate;
}
@keyframes loading-screen {
  from {
    opacity: 0.3;
  }
}
`
// The wallpaper ships inside index.html, so it paints together with the title instead of after another request.
const wallpaperOptions = {
  quality: 30,
  width: 1600,
}
/** Paints the title over the level’s wallpaper as plain HTML, which covers the page while the scripts download and the scene loads. The app fades it out to the menu once the scene is ready. */
const loadingScreenPlugin = ({tagline, title, wallpaper}: LoadingScreen): Plugin => {
  let root: string
  let cache: AvifCache
  return {
    name: 'loading-screen',
    configResolved(config) {
      root = config.root
      cache = new AvifCache(resolve(root, 'temp/vite-plugin-avif-only/cache'), wallpaperOptions)
    },
    async transformIndexHtml() {
      const attrs: Record<string, string> = {
        id: 'loading-screen',
        'aria-busy': 'true',
      }
      if (wallpaper) {
        const image = await fs.readFile(await cache.convert(resolve(root, wallpaper)))
        attrs.style = `--wallpaper: url(data:image/avif;base64,${image.toBase64()})`
      }
      return [
        {
          tag: 'style',
          children: style,
          injectTo: 'head',
        },
        {
          tag: 'div',
          attrs,
          children: `<div><h1>${title}</h1><p>${tagline}</p><span>Loading…</span></div>`,
          injectTo: 'body-prepend',
        },
      ]
    },
  }
}

export default loadingScreenPlugin
