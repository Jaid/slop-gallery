export const auditionTranscript = ['Abyssal Lantern.', 'Kintsugi Dawn.', 'Quantum Moiré.', 'Porcelain Constellation.', 'GPT-6 Astra.']

const geminiVoices = [
  {
    id: '01-sparkle-guide',
    title: 'Sparkle guide',
    voice: 'Zephyr',
    character: 'A cheerful young adult anime heroine who has just found the coolest exhibit ever. Bright, smiling, lightly high-pitched, bouncy melodic phrasing with tiny excited lifts. Cute and enthusiastic without shouting or squeaking.',
  },
  {
    id: '02-smug-catgirl',
    title: 'Smug catgirl',
    voice: 'Leda',
    character: 'A mischievous young adult anime catgirl curator. Light, nimble feminine voice, playful smug smile, teasing sing-song inflection and a little purr in the tone. Every title sounds like a delightful secret she knows before you. Do not add meows or extra words.',
  },
  {
    id: '03-sleepy-witch',
    title: 'Sleepy witch',
    voice: 'Callirrhoe',
    character: 'A young adult anime witch running a magical museum after midnight. Soft, cozy, drowsily amused feminine voice, gentle lower pitch, unhurried lilting delivery. Quietly quirky and adorable, but fully intelligible; not whispered ASMR.',
  },
  {
    id: '04-tsundere-curator',
    title: 'Tsundere curator',
    voice: 'Kore',
    character: 'A young adult tsundere anime curator trying very hard to sound professional while obviously delighted. Crisp feminine voice, mock-serious opening, tiny haughty emphasis, then a warm upward curl at the end. Comedic confidence, never angry or mean.',
  },
  {
    id: '05-space-idol',
    title: 'Space idol',
    voice: 'Laomedeia',
    character: 'A young adult anime space idol introducing cosmic treasures to one friend. Sparkling feminine voice with clear bell-like diction, musical rises and falls, buoyant confidence and starry-eyed wonder. Speak rather than sing; no stage shouting.',
  },
  {
    id: '06-gremlin-engineer',
    title: 'Gremlin engineer',
    voice: 'Aoede',
    character: 'A young adult anime inventor who is absurdly pleased that her impossible knot machine works. Quick, bright, impish feminine delivery, comic punch on unusual syllables, a barely contained grin. Quirky science gremlin energy, not manic or shrill.',
  },
  {
    id: '07-shy-librarian',
    title: 'Shy librarian',
    voice: 'Erinome',
    character: 'A shy young adult anime librarian sharing her favorite magical artifacts. Delicate, warm feminine voice, a small breath before each title, gentle curiosity and a quietly proud finish. Sweet and slightly bashful, with no stammering and no whispering.',
  },
  {
    id: '08-royal-chuunibyou',
    title: 'Royal chuunibyou',
    voice: 'Pulcherrima',
    character: 'A young adult anime girl who playfully believes she is the empress of impossible geometry. Rich, rounded feminine voice, adorably overdramatic grandeur, theatrical stress and a knowingly silly regal flourish. Brief titles, not a booming trailer narrator.',
  },
  {
    id: '09-sunshine-senpai',
    title: 'Sunshine senpai',
    voice: 'Sulafat',
    character: 'A kind young adult anime senpai giving a friend a private tour. Warm honeyed feminine tone, relaxed smiling cadence, reassuring affection and a tiny amused lilt. Cute through warmth rather than exaggerated pitch; bright conversational intimacy.',
  },
  {
    id: '10-deadpan-android',
    title: 'Deadpan android',
    voice: 'Despina',
    character: 'A young adult anime android girl discovering that she likes art. Clear, light feminine voice, precise nearly deadpan timing, subtly curious rising endings and unexpectedly cute tiny bursts of wonder. Dry comedy through delivery, not robotic processing.',
  },
] as const

export const voiceAuditions = [
  ...geminiVoices.map(candidate => ({
    ...candidate,
    model: 'google/gemini-3.1-flash-tts-preview',
  })),
  ...[8, 5, 2, 3].map((index, i) => ({
    ...geminiVoices[index],
    id: `${11 + i}-longan-${geminiVoices[index].id.slice(3)}`,
    title: `Longan – ${geminiVoices[index].title}`,
    voice: 'longanlingxin',
    model: 'qwen/qwen-audio-3.0-tts-plus',
  })),
]

export type VoiceAudition = typeof voiceAuditions[number]

export function auditionInput(character: string, text: string) {
  return `Read aloud in this voice: ${character}\n\nSay exactly: ${text}`
}

export function auditionRequest(candidate: VoiceAudition, text: string) {
  const google = candidate.model.startsWith('google/')
  return {
    model: candidate.model,
    voice: candidate.voice,
    input: google ? auditionInput(candidate.character, text) : text,
    response_format: 'pcm',
    ...google ? {} : {
      provider: {
        options: {
          alibaba: {
            instruction: `${candidate.character} Speak clear American English. Read only the supplied text, exactly once, then stop. Spell GPT as English letters and read the number six.`,
            sample_rate: 24_000,
          },
        },
      },
    },
  }
}
