# vite-plugin-jxl

Encodes imported images as JPEG XL with [ImageMagick](https://imagemagick.org) and [cjxl](https://github.com/libjxl/libjxl), and makes the import the URL of the encoded image.

```ts
import jxl from 'vite-plugin-jxl'

export default {
  plugins: [jxl()],
}
```

By default, only imports that ask for it with the import attribute `format: 'jxl'` change:

```ts
// 3840 px on its longer side at most, at distance 3
import wallpaper from './wallpaper.png' with {format: 'jxl', maximumLong: '3840', distance: '3'}

// untouched
import photo from './photo.png'
```

Import attributes are string-valued, so numbers are written as strings. The accepted attributes are:

- `format: 'jxl'` – encodes the image; imports with any other format are left to other plugins
- `distance: string` – Butteraugli distance from `'0'` (lossless) to `'25'`, defaults to the `distance` option
- `maximumLong: string` – the length in pixels the longer side is scaled down to if it is longer, defaults to the `maximumLong` option
- `maximumPixels: string` – the number of pixels the image is scaled down to if it has more, keeping its aspect ratio, defaults to the `maximumPixels` option

With both limits, the tighter one wins. Images are never scaled up.

Any other attribute fails the build. Only static imports and re-exports are covered, not dynamic `import()`.

## Options

- `distance?: number` – defaults to `1`
- `maximumLong?: number` – unlimited by default
- `maximumPixels?: number` – unlimited by default
- `effort?: number` – cjxl’s effort from 1 to 11, defaults to `10`; 11 passes `--allow_expert_options`
- `include?: FilterPattern` – image files whose imports are encoded even without `format: 'jxl'`, as in `include: /\.png$/u`, none by default; their imports may still carry `distance` and `maximumLong`
- `folder?: string` – the cache, relative to the Vite root, defaults to `temp/vite-plugin-jxl`
- `magickPath?: string` and `cjxlPath?: string` – the executables, `magick` and `cjxl` from the PATH by default

## Encoding

ImageMagick decodes the first frame of the image, scales it down if it exceeds a limit, rotates it upright and pipes it to cjxl as an uncompressed PNG. The scaling averages in linear light at 16 bits with a sharpened Lanczos, so that thin highlights keep their brightness, and goes straight to the size that fits both limits, rounded down:

```sh
magick input[0] -depth 16 -colorspace RGB -filter LanczosSharp -distort Resize 3840x2160! -colorspace sRGB -depth 8 -auto-orient png:- | cjxl - --effort 10 --brotli_effort 11 -x strip=exif -x strip=xmp -x strip=jumbf --distance 3 output.jxl
```

A JPEG at distance 0 that fits the limits skips ImageMagick, so that cjxl transcodes it without losing a pixel. It drops what it would need to restore the JPEG file itself, as that includes the metadata.

Every image loses its metadata: Exif, XMP and JUMBF, like camera details, dates, locations and editing history. Only what changes how it looks stays: its pixels, its color profile and its orientation, which cjxl moves from the Exif into the image header. Images without metadata come out as a bare codestream without the JXL container around it.

Encoded images are cached by a hash of their source’s contents and their encoding, so they are only encoded again once either changes.

## Output

During `vite build`, the encoded image is emitted as an asset named after its source, like `wallpaper.jxl` for `wallpaper.png`, whose `originalFileNames` list the source. Other plugins can look it up by that in the bundle. During development, the import points at the cached file.

Without the plugin, Vite and Rolldown ignore the attributes and the import is the URL of the source image, so the plugin can be limited to production builds.

The plugin runs in Bun, whose shell spawns the encoders.
