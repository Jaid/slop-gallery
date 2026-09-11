/** Keep Iris’s natural delivery; Grok reads input literally rather than interpreting Gemini prompts. */
const narrator = {
  model: 'x-ai/grok-voice-tts-1.0',
  voice: 'iris',
  providerOptions: {xai: {language: 'en'}},
}

export default narrator
