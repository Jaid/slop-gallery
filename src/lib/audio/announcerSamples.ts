import claudeFableAudio from 'voice:claude-fable' with {format: 'opus', language: 'en', text: 'Claude Fable'}
import claudeOpusAudio from 'voice:claude-opus' with {format: 'opus', language: 'en', text: 'Claude Opus'}
import claudeSonnetAudio from 'voice:claude-sonnet' with {format: 'opus', language: 'en', text: 'Claude Sonnet'}
import deepseekFlashAudio from 'voice:deepseek-flash' with {format: 'opus', language: 'en', text: 'DeepSeek Flash'}
import geminiFlashAudio from 'voice:gemini-flash' with {format: 'opus', language: 'en', text: 'Gemini Flash'}
import glmAudio from 'voice:glm' with {format: 'opus', language: 'en', text: 'GLM'}
import gptAstraAudio from 'voice:gpt-astra' with {format: 'opus', language: 'en', text: 'GPT Astra'}
import grokAudio from 'voice:grok' with {format: 'opus', language: 'en', text: 'Grok'}

export const announcerSamples = [
  {
    id: 'claude-fable',
    label: 'Claude Fable',
    audio: claudeFableAudio,
  },
  {
    id: 'claude-opus',
    label: 'Claude Opus',
    audio: claudeOpusAudio,
  },
  {
    id: 'claude-sonnet',
    label: 'Claude Sonnet',
    audio: claudeSonnetAudio,
  },
  {
    id: 'deepseek-flash',
    label: 'DeepSeek Flash',
    audio: deepseekFlashAudio,
  },
] as const

export const announcerSamplePriority = 'normal' as const
export const announcerPriorityModes = ['volatile', 'high', 'inject', 'async'] as const

export const announcerPrioritySamples = [
  {
    id: 'gemini-flash',
    label: 'Gemini Flash',
    audio: geminiFlashAudio,
  },
  {
    id: 'glm',
    label: 'GLM',
    audio: glmAudio,
  },
  {
    id: 'gpt-astra',
    label: 'GPT Astra',
    audio: gptAstraAudio,
  },
  {
    id: 'grok',
    label: 'Grok',
    audio: grokAudio,
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
