import {create} from 'zustand'

const glideMs = 300
const fadeMs = 600
const findLoadingScreen = () => document.querySelector<HTMLElement>('#loading-screen')

/** Whether the title that index.html paints over the world’s wallpaper still covers the page, which it does until the scene is ready. */
export const useLoadingScreen = create<{shown: boolean}>(() => ({shown: findLoadingScreen() !== null}))

/** Fades the loading screen out to whatever is behind it, then removes it for good. */
export function hideLoadingScreen() {
  if (!useLoadingScreen.getState().shown) {
    return
  }
  useLoadingScreen.setState({shown: false})
  const element = findLoadingScreen()
  if (!element) {
    return
  }
  // Lets clicks through to the menu while it fades.
  element.setAttribute('aria-busy', 'false')
  // The menu mounts with the state change above and has its layout by the next frame.
  requestAnimationFrame(() => {
    const content = element.firstElementChild
    const from = element.querySelector('h1')?.getBoundingClientRect()
    const to = document.querySelector('#menu-title')?.getBoundingClientRect()
    let delay = 0
    // The title first glides to where the menu shows its own, so the menu fades in around it instead of showing it twice.
    if (content && from && to) {
      delay = glideMs
      content.animate({transform: ['none', `translate(${to.left - from.left}px, ${to.top - from.top}px)`]}, {
        duration: glideMs,
        easing: 'ease-out',
        fill: 'forwards',
      })
      element.querySelector('span')?.animate({opacity: 0}, {
        duration: glideMs,
        fill: 'forwards',
      })
    }
    const fade = element.animate({opacity: [1, 0]}, {
      duration: fadeMs,
      delay,
      easing: 'ease-in-out',
      fill: 'forwards',
    })
    fade.addEventListener('finish', () => element.remove())
  })
}
