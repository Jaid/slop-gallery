import {join} from 'node:path'

import fs from 'fs-extra'
import {encodeJxl} from 'knot-materials/scripts/lib/encodeJxl.ts'

import {openHeadlessGallery, repositoryRoot, resolveGallerySetup} from './lib/headlessGallery.ts'

type PropHandles = {
  propObjects: Map<string, {snapshot: () => Promise<Blob>}>
}

if (Bun.argv.includes('--help')) {
  console.log(`Usage: bun scripts/photographOrbs.ts

Photographs every orb in the studio a thrown prop is photographed in, the way a throw did before orbs brought their own, and writes each to src/lib/gallery/orbs/<id>/photo.jxl, which the portal of its merges shows.
Opens the Sandbox with all orbs on their pedestals in a private headless browser; rerun it when an orb’s glass changes or a new orb joins. A new orb’s class imports its photograph, so give its folder any photo.jxl to start from.`)
  process.exit(0)
}
const folder = join(repositoryRoot, 'src', 'lib', 'gallery', 'orbs')
// Every orb lives in a folder of its own, named after its id.
const entries = await fs.readdir(folder, {withFileTypes: true})
const ids = entries.filter(entry => entry.isDirectory() && entry.name !== 'base').map(entry => entry.name)
const setup = await resolveGallerySetup({
  graphics: 'heavy',
  seed: '1',
  world: 'sandbox',
  item: ids.map(id => `prop-orb-${id}`).join(','),
})
await using gallery = await openHeadlessGallery(setup, {cacheDir: 'node_modules/.vite-orb-photos'})
await fs.ensureDir(join(repositoryRoot, 'temp'))
const temporary = await fs.mkdtemp(join(repositoryRoot, 'temp', 'orb-photos-'))
try {
  for (const id of ids) {
    const result = await gallery.page.evaluate(async (propId, modulePath) => {
      // The studio encodes a WebP; a lossless PNG of the same canvas goes to the JPEG XL encoder instead.
      const prototype = OffscreenCanvas.prototype
      // eslint-disable-next-line typescript/unbound-method -- called with each canvas as this, and put back afterward
      const encode = prototype.convertToBlob
      let png: Blob | undefined
      prototype.convertToBlob = async function (this: OffscreenCanvas, options) {
        png = await encode.call(this, {type: 'image/png'})
        return encode.call(this, options)
      }
      try {
        const {propObjects} = await import(modulePath) as PropHandles
        const prop = propObjects.get(propId)
        if (!prop) {
          return {error: `${propId} is not among the props: ${propObjects.keys().toArray().join(', ')}`}
        }
        await prop.snapshot()
        const bytes = await png!.bytes()
        return {png: bytes.toBase64()}
      } finally {
        prototype.convertToBlob = encode
      }
    }, `prop-orb-${id}`, '/src/components/Scene/GrabbableProp.tsx')
    if ('error' in result) {
      throw new Error(result.error)
    }
    const png = join(temporary, `${id}.png`)
    await Bun.write(png, Uint8Array.fromBase64(result.png))
    const output = join(folder, id, 'photo.jxl')
    await encodeJxl(png, output)
    console.log(`Wrote ${output}`)
  }
} finally {
  await fs.remove(temporary)
}
