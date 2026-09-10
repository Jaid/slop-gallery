export async function loadModelIcons(sources: Iterable<string>) {
  const urls = new Set(sources)
  const images = new Map<string, HTMLImageElement>
  await Promise.all(Array.from(urls, async url => {
    const image = new Image
    image.src = url
    try {
      await image.decode()
      images.set(url, image)
    } catch (error) {
      console.warn('Knot model icon could not be loaded.', url, error)
    }
  }))
  return images
}
