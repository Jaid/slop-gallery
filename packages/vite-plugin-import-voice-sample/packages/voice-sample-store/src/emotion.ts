const nativeEmotionTags = new Set([
  'build-intensity',
  'decrease-intensity',
  'emphasis',
  'fast',
  'higher-pitch',
  'loud',
  'lower-pitch',
  'sing-song',
  'singing',
  'slow',
  'soft',
  'whisper',
])
const emotionAliases: Record<string, string | undefined> = {
  angry: 'loud',
  calm: 'soft',
  cheerful: 'sing-song',
  dramatic: 'emphasis',
  energetic: 'build-intensity',
  enthusiastic: 'build-intensity',
  excited: 'build-intensity',
  forceful: 'loud',
  gentle: 'soft',
  happy: 'sing-song',
  intense: 'build-intensity',
  playful: 'sing-song',
  quiet: 'soft',
  sad: 'soft',
  secretive: 'whisper',
  soothing: 'soft',
  urgent: 'loud',
}

export const styleVoiceSampleText = (text: string, emotion?: string) => {
  if (!emotion || emotion.toLowerCase() === 'neutral') {
    return text
  }
  const normalized = emotion.trim().toLowerCase()
  const tag = nativeEmotionTags.has(normalized) ? normalized : emotionAliases[normalized]
  if (!tag) {
    throw new Error(`Unsupported voice sample emotion "${emotion}". Use an xAI wrapping speech tag or a supported semantic alias.`)
  }
  return `<${tag}>${text}</${tag}>`
}
