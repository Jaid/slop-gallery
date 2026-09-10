# vite-plugin-avif-only

Keep JXL masters in the repository and deliver AVIF to browsers. Requires Bun and ImageMagick with JXL and HEIC/AVIF support.

```ts
import avifOnly from 'vite-plugin-avif-only'

export default {
  plugins: [avifOnly()]
}
```

Slop Gallery enables the plugin **only in its production config**. Development serves native JXL to the local JXL-enabled browsers.

## Assets

- Static imports, including Vite aliases, export forwarding and `?url` imports.
- `new URL('./image.jxl', import.meta.url)`, including expression-free template literals.
- CSS `url()` references and literal public URLs such as `/art/portrait.jxl` in JavaScript and HTML.
- Public assets copied by Vite or an earlier `writeBundle` hook. Conversion runs after level-specific filtering, so the other level’s images stay excluded.

Production source assets are converted before Vite’s normal asset hashing, inlining and base-path handling. Copied public JXLs become `.avif` files at the same relative paths. No JXL files ship in the production output. Arbitrary URLs assembled at runtime are not rewritten; use one of the static forms above.

If enabled in development, the plugin also serves generated AVIFs on demand, with correct MIME types, ETags, HEAD support and Vite’s filesystem access checks. It does not install a browser decoder or perform format detection.

## Encoding and cache

Defaults match:

```sh
magick input.jxl -auto-orient -colorspace sRGB -background black -alpha background -strip -quality 50 -define heic:chroma=420 -define heic:speed=0 -depth 8 output.avif
```

Transparency is preserved. Color normalization precedes metadata stripping. Speed 0 makes the initial conversion expensive; unchanged images reuse the cache.

The default cache is `<Vite root>/temp/vite-plugin-avif-only/cache/[hash].avif`. The hash covers the source bytes, encoder version, conversion policy and quality settings. Concurrent requests for the same content share one conversion. At most two conversions run at once, and incomplete files never become cache hits. Cache files are disposable and should be ignored by Git.

```ts
avifOnly({
  cacheDir: 'temp/vite-plugin-avif-only/cache',
  magick: 'magick',
  quality: 50,
  speed: 0
})
```
