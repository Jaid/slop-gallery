import type {HtmlTagDescriptor, Plugin, Rolldown} from 'vite'

import {isAbsolute, relative} from 'node:path'

import {normalizePath} from 'vite'

type LoadingScreen = {
  tagline: string
  title: string
  /** the file of the image behind the title, which a module of the page has to import as well, so that the build holds it */
  wallpaper?: string
}
type LoadingScreenOptions<Id extends string> = {
  /** the world whose screen the page starts with, before the script below picks the URL’s */
  defaultWorld: NoInfer<Id>
  /** a self-contained function that picks the world from the URL query, called with the query and {@link selectorArguments} */
  select: (search: string, ...selectorArguments: Array<never>) => NoInfer<Id>
  /** the arguments {@link select} gets after the query, which have to survive JSON */
  selectorArguments?: ReadonlyArray<unknown>
  worlds: Readonly<Record<Id, LoadingScreen>>
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
const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
/**
 * Paints the title over the wallpaper of the world the URL opens as plain HTML, which covers the page while the scripts download and the scene loads. The app fades it out to the menu once the scene is ready.
 *
 * Every world shares one page, so a small inline script right after the screen picks the world from the URL before the first paint, with the same function the app picks it with, and sets its title, tagline and wallpaper.
 */
const loadingScreenPlugin = <Id extends string>({defaultWorld, select, selectorArguments = [], worlds}: LoadingScreenOptions<Id>): Plugin => {
  let base: string
  let root: string
  /** the wallpaper’s URL: the file itself during development, otherwise what the build made of the page’s import of it, which other plugins may have converted */
  const wallpaperUrl = (file: string, bundle?: Rolldown.OutputBundle) => {
    const originalFileName = normalizePath(relative(root, file))
    if (!bundle) {
      return originalFileName.startsWith('../') || isAbsolute(originalFileName) ? `${base}@fs/${normalizePath(file)}` : `${base}${originalFileName}`
    }
    const asset = Object.values(bundle).find(output => output.type === 'asset' && output.originalFileNames.includes(originalFileName))
    if (!asset) {
      throw new Error(`The build holds no ${originalFileName}, so the loading screen cannot show it. A module of the page has to import it.`)
    }
    return `${base}${asset.fileName}`
  }
  return {
    name: 'loading-screen',
    configResolved(config) {
      base = config.base
      root = config.root
    },
    transformIndexHtml(_html, {bundle}) {
      const {title, tagline} = worlds[defaultWorld]
      const screens = Object.fromEntries(Object.entries<LoadingScreen>(worlds).map(([id, world]) => [id, {
        title: world.title,
        tagline: world.tagline,
        ...world.wallpaper ? {wallpaper: wallpaperUrl(world.wallpaper, bundle)} : {},
      }]))
      // The preload scanner does not look into style attributes, so without the hint a wallpaper would only start downloading once the loading screen is styled.
      const script = `{
const world = ${JSON.stringify(screens)}[(${select.toString()})(location.search, ...${JSON.stringify(selectorArguments)})]
const screen = document.querySelector('#loading-screen')
screen.querySelector('h1').textContent = world.title
screen.querySelector('p').textContent = world.tagline
document.title = world.title
if (world.wallpaper) {
  screen.style.setProperty('--wallpaper', \`url(\${world.wallpaper})\`)
  document.head.append(Object.assign(document.createElement('link'), {rel: 'preload', as: 'image', type: 'image/jxl', href: world.wallpaper, fetchPriority: 'high'}))
}
}`
      const tags: Array<HtmlTagDescriptor> = [
        {
          tag: 'style',
          children: style,
          injectTo: 'head',
        },
        {
          tag: 'div',
          attrs: {
            id: 'loading-screen',
            'aria-busy': 'true',
          },
          children: `<div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(tagline)}</p><span>Loading…</span></div>`,
          injectTo: 'body-prepend',
        },
        {
          tag: 'script',
          children: script,
          injectTo: 'body-prepend',
        },
      ]
      return tags
    },
  }
}

export default loadingScreenPlugin
