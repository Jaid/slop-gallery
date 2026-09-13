export const modelSignBackground = '#10252b'
const modelSignDesignSize = [2048, 491] as const
export const modelSignTextureSize = [1024, 246] as const
const scale = modelSignTextureSize[0] / modelSignDesignSize[0]
export const modelSignFontSize = Math.round(190 * scale)

/** A single opaque printed face, with no detached text planes or duplicate number range. */
export default function drawFace(context: CanvasRenderingContext2D, title: string, icon?: HTMLImageElement) {
  const [width, height] = modelSignTextureSize
  const border = 22 * scale
  context.fillStyle = modelSignBackground
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#ac9270'
  context.lineWidth = 6 * scale
  context.strokeRect(border, border, width - border * 2, height - border * 2)
  const iconSize = 300 * scale
  const iconLeft = 90 * scale
  const textLeft = icon ? iconLeft + iconSize + 80 * scale : 90 * scale
  const textWidth = width - textLeft - 90 * scale
  context.font = `600 ${modelSignFontSize}px main`
  const measured = context.measureText(title).width || 1
  const fontSize = Math.floor(modelSignFontSize * Math.min(1, textWidth / measured))
  context.font = `600 ${fontSize}px main`
  context.fillStyle = '#fff3d9'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(title, textLeft + textWidth / 2, height / 2, textWidth)
  if (icon) {
    const imageScale = iconSize / Math.max(icon.naturalWidth, icon.naturalHeight)
    const iconWidth = icon.naturalWidth * imageScale
    const iconHeight = icon.naturalHeight * imageScale
    context.drawImage(icon, iconLeft + (iconSize - iconWidth) / 2, (height - iconHeight) / 2, iconWidth, iconHeight)
  }
}
