# vite-plugin-jxl-headers

Cloudflare Pages serves JPEG XL images as `application/octet-stream`. This plugin emits a [`_headers`](https://developers.cloudflare.com/pages/configuration/headers/) file into the build output that serves them as `image/jxl` instead.

```ts
import jxlHeaders from 'vite-plugin-jxl-headers'

export default {
  plugins: [jxlHeaders()],
}
```

The plugin only runs during `vite build`. A `_headers` file in the public directory would conflict with the emitted one.
