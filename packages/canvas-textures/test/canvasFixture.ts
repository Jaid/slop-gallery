import {mock} from 'bun:test'

/** Canvas double deliberately returns an offset view to catch accidental whole-buffer uploads. */
export function canvasFixture() {
  const original = globalThis.document
  const surfaces: Array<ReturnType<typeof createCanvas>> = []
  function createCanvas() {
    const canvas = {
      width: 0,
      height: 0,
    }
    let lastPixels: Uint8ClampedArray | undefined
    const context = {
      canvas,
      fillRect: mock(() => {}),
      getImageData: mock(() => {
        const size = canvas.width * canvas.height * 4
        lastPixels = new Uint8ClampedArray(new ArrayBuffer(size + 16), 8, size)
        lastPixels.fill(127)
        return {
          data: lastPixels,
          width: canvas.width,
          height: canvas.height,
        }
      }),
    }
    return {
      canvas: Object.assign(canvas, {getContext: mock(() => context)}),
      context,
      pixels: () => lastPixels!,
    }
  }
  const createElement = mock(() => {
    const surface = createCanvas()
    surfaces.push(surface)
    return surface.canvas
  })
  const fonts = {
    load: mock(async () => []),
    ready: new Promise(() => {}),
  }
  Object.assign(globalThis, {
    document: {
      createElement,
      fonts,
    },
  })
  return {
    surfaces,
    createElement,
    fonts,
    restore: () => Object.assign(globalThis, {document: original}),
  }
}

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))
