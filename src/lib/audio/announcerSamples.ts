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

export const announcerPriorityModes = ['normal', 'high', 'inject', 'async'] as const
