import renderCanvasTexture from 'canvas-textures/three'
import {simplex2d} from 'math/noise'
import {mulberry32} from 'math/random'
import {RepeatWrapping, SRGBColorSpace} from 'three/webgpu'

const createMulberry32 = (seed: number) => {
  const state = mulberry32.create(seed)
  return () => mulberry32.sample(state)
}

export function surfaceTexture(kind: 'plaster' | 'stone' | 'wood') {
  const size = 512
  const t = renderCanvasTexture({
    width: size,
    height: size,
    draw(ctx) {
      ctx.fillStyle = kind === 'wood' ? '#735139' : (kind === 'stone' ? '#c9c3b1' : '#e5e0d2')
      ctx.fillRect(0, 0, size, size)
      const rand = createMulberry32(91)
      for (let i = 0; i < 28_000; i++) {
        const x = rand() * size
        const y = rand() * size
        const shade = rand()
        ctx.fillStyle = kind === 'wood' ? `rgba(35,20,10,${shade * 0.12})` : `rgba(${shade > 0.5 ? '255,255,240' : '60,57,45'},${rand() * 0.15})`
        // Marks crossing an edge continue on the opposite side, so the texture tiles without seams.
        if (kind === 'wood') {
          const width = rand() * 2
          const height = rand() * 90
          eachTileCopy(size, [x, y, x + width, y + height], (dx, dy) => ctx.fillRect(x + dx, y + dy, width, height))
        } else {
          const radiusX = rand() * (kind === 'stone' ? 2.5 : 1)
          const radiusY = rand() * 1.6
          const rotation = rand() * 6
          const radius = Math.max(radiusX, radiusY)
          eachTileCopy(size, [x - radius, y - radius, x + radius, y + radius], (dx, dy) => {
            ctx.beginPath()
            ctx.ellipse(x + dx, y + dy, radiusX, radiusY, rotation, 0, Math.PI * 2)
            ctx.fill()
          })
        }
      }
    },
  })
  t.colorSpace = SRGBColorSpace
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.repeat.set(kind === 'stone' ? 8 : 3, kind === 'stone' ? 8 : 3)
  t.anisotropy = 8
  return t
}

/** Cream and charcoal marble, adapted from the reference run’s vestibule tiles. */
export function checkerMarbleTexture(width: number, depth: number) {
  const size = 512
  const texture = renderCanvasTexture({
    width: size,
    height: size,
    draw(context) {
      const random = createMulberry32(61)
      const noise = simplex2d.create(61)
      const cells = 4
      const cell = size / cells
      for (let row = 0; row < cells; row++) {
        for (let column = 0; column < cells; column++) {
          const dark = (row + column) % 2 === 0
          context.fillStyle = dark ? '#23201d' : '#d8cfbf'
          context.fillRect(column * cell, row * cell, cell, cell)
          context.save()
          context.beginPath()
          context.rect(column * cell, row * cell, cell, cell)
          context.clip()
          for (let vein = 0; vein < 5; vein++) {
            context.strokeStyle = dark ? 'rgba(210,205,195,0.13)' : 'rgba(90,80,70,0.16)'
            context.lineWidth = 1 + random() * 2.2
            context.beginPath()
            let x = column * cell + random() * cell
            let y = row * cell
            context.moveTo(x, y)
            while (y < (row + 1) * cell) {
              x += simplex2d.sample(noise, x * 0.02, y * 0.02) * 14
              y += 10
              context.lineTo(x, y)
            }
            context.stroke()
          }
          context.restore()
        }
      }
      context.strokeStyle = '#151210'
      context.lineWidth = 3
      for (let i = 0; i <= cells; i++) {
        context.beginPath()
        context.moveTo(i * cell, 0)
        context.lineTo(i * cell, size)
        context.moveTo(0, i * cell)
        context.lineTo(size, i * cell)
        context.stroke()
      }
    },
  })
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  // The reference samples 0.36 repeats per meter: each tile is about 69 cm wide.
  texture.repeat.set(width * 0.36, depth * 0.36)
  return texture
}

/** Calls `draw` with every tile offset at which a mark within `bounds` ([left, top, right, bottom]) shows inside a repeating tile of `size`. */
function eachTileCopy(size: number, bounds: [number, number, number, number], draw: (dx: number, dy: number) => void) {
  const [left, top, right, bottom] = bounds
  const offsets = (start: number, end: number) => [0, -size, size].filter(offset => offset === 0 || start + offset < size && end + offset > 0)
  for (const dx of offsets(left, right)) {
    for (const dy of offsets(top, bottom)) {
      draw(dx, dy)
    }
  }
}
