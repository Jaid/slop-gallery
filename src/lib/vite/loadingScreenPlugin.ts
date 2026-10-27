import type {Plugin} from 'vite'

type LoadingScreen = {
  tagline: string
  title: string
}

// Mirrors the welcome menu before it turns ready, so the swap to it is barely visible.
const style = `
#loading-screen {
  position: fixed;
  inset: 0;
  display: grid;
  padding: 2rem 1rem;
  font-family: main, system-ui, sans-serif;
  color: #eee;
  text-align: center;
  background: rgb(0 0 0 / 80%);
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
  color: #aaa;
}
#loading-screen span {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.85rem 1.5rem;
  border: 1px solid #e5cf87;
  border-radius: 4px;
  color: #e5cf87;
  opacity: 0.4;
}
`
const arrow = '<svg aria-hidden="true" fill="none" height="18" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" viewBox="0 0 24 24" width="18"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>'
/** Paints the welcome menu as plain HTML, which shows while the scripts still download. The app removes it once it renders the real one. */
const loadingScreenPlugin = ({tagline, title}: LoadingScreen): Plugin => ({
  name: 'loading-screen',
  transformIndexHtml() {
    return [
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
        children: `<div><h1>${title}</h1><p>${tagline}</p><span>Opening ${title}…${arrow}</span></div>`,
        injectTo: 'body-prepend',
      },
    ]
  },
})

export default loadingScreenPlugin
