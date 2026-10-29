import type {HtmlTagDescriptor, Plugin} from 'vite'

import {resolve} from 'node:path'

import fs from 'fs-extra'

type LoadingScreen = {
  tagline: string
  title: string
  /** image behind the title, relative to the public directory */
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
/** Paints the title over the level’s wallpaper as plain HTML, which covers the page while the scripts download and the scene loads. The app fades it out to the menu once the scene is ready. */
const loadingScreenPlugin = ({tagline, title, wallpaper}: LoadingScreen): Plugin => {
  let base: string
  let publicDir: string
  return {
    name: 'loading-screen',
    configResolved(config) {
      base = config.base
      publicDir = config.publicDir
    },
    async generateBundle() {
      if (!wallpaper) {
        return
      }
      if (!publicDir) {
        this.error('The loading screen’s wallpaper requires a public directory.')
      }
      this.emitFile({
        type: 'asset',
        fileName: wallpaper,
        source: await fs.readFile(resolve(publicDir, wallpaper)),
      })
    },
    transformIndexHtml() {
      const attrs: Record<string, string> = {
        id: 'loading-screen',
        'aria-busy': 'true',
      }
      const tags: Array<HtmlTagDescriptor> = [
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
      if (wallpaper) {
        const url = `${base}${wallpaper}`
        attrs.style = `--wallpaper: url(${url})`
        // The preload scanner does not look into style attributes, so without the hint the wallpaper would only start downloading once the loading screen is styled.
        tags.push({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'image',
            type: 'image/jxl',
            href: url,
            fetchpriority: 'high',
          },
          injectTo: 'head',
        })
      }
      return tags
    },
  }
}

export default loadingScreenPlugin
