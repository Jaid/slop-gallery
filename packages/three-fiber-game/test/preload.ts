// Rapier and Drei’s maath have no exports maps, so Bun imports their CommonJS mains, which require Three’s deprecated CommonJS build and a second Fiber.
// Serve their ESM builds beside them instead, as Vite does; Fiber’s own exports map already resolves to ESM.
await Bun.plugin({
  name: 'esm-mains',
  setup(build) {
    build.onLoad({filter: /[/\\](?:maath|react-three-rapier)\.cjs\.js$/u}, ({path}) => ({
      contents: `export * from ${JSON.stringify(path.replace(/\.cjs\.js$/u, '.esm.js'))}`,
      loader: 'js',
    }))
  },
})
