export const announcerSamples = [
  {
    id: 'claude-fable',
    label: 'Claude Fable',
    audio: String(new URL('announcerSamples/claude-fable.opus', import.meta.url)),
  },
  {
    id: 'claude-opus',
    label: 'Claude Opus',
    audio: String(new URL('announcerSamples/claude-opus.opus', import.meta.url)),
  },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet',
    audio: String(new URL('announcerSamples/claude-sonnet.opus', import.meta.url)),
  },
  {
    id: 'deepseek-flash',
    label: 'DeepSeek Flash',
    audio: String(new URL('announcerSamples/deepseek-flash.opus', import.meta.url)),
  },
] as const

export const announcerSamplePriority = 'normal' as const
export const announcerPriorityModes = ['volatile', 'high', 'inject', 'async'] as const

export const announcerPrioritySamples = [
  {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    audio: String(new URL('announcerSamples/gemini-flash.opus', import.meta.url)),
  },
  {
    id: 'glm',
    label: 'GLM',
    audio: String(new URL('announcerSamples/glm.opus', import.meta.url)),
  },
  {
    id: 'gpt-astra',
    label: 'GPT Astra',
    audio: String(new URL('announcerSamples/gpt-astra.opus', import.meta.url)),
  },
  {
    id: 'grok',
    label: 'Grok',
    audio: String(new URL('announcerSamples/grok.opus', import.meta.url)),
  },
] as const
export const announcerPriorityDemos = announcerPriorityModes.map((priority, index) => {
  const sample = announcerPrioritySamples[index]
  return {
    priority,
    sample,
    title: `${priority.toUpperCase()} · ${sample.label}`,
  }
})
