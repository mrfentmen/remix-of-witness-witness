// AI forensics helpers. Provides transcription-based phrase flagging, deepfake
// score simulation, and AI incident summary generation. All are client-side
// mocks usable until real ML backends are wired.

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  flaggedPhrases?: string[];
}

export interface DeepfakeScore {
  overall: number;
  facialBoundary: number;
  blinking: number;
  lighting: number;
  temporal: number;
}

export interface IncidentSummary {
  who: string;
  what: string;
  when: string;
  where: string;
  concerns: string[];
}

const KEY_PHRASES = [
  "i can not breathe",
  "hands up",
  "do not shoot",
  "stop resisting",
  "i am not resisting",
  "get off me",
  "you are hurting me",
  "i want a lawyer",
  "am i being detained",
  "i do not consent",
  "stop please",
  "help me",
  "he has a gun",
  "she has a gun",
];

/** Generates a mock transcription with flagged key phrases. */
export function generateMockTranscription(durationSeconds: number): TranscriptionSegment[] {
  const phrases: TranscriptionSegment[] = [
    {
      start: 0,
      end: 3.5,
      text: "Officer, I am recording this interaction.",
      flaggedPhrases: [],
    },
    {
      start: 3.8,
      end: 7.2,
      text: "I do not consent to a search of my vehicle.",
      flaggedPhrases: ["i do not consent"],
    },
    {
      start: 7.5,
      end: 12.0,
      text: "I am exercising my right to remain silent.",
      flaggedPhrases: [],
    },
  ];

  // Scale segments to match approximate duration
  if (durationSeconds > 15) {
    phrases.push({
      start: 12.5,
      end: 18.0,
      text: "Please stop, you are hurting me.",
      flaggedPhrases: ["stop please", "you are hurting me"],
    });
  }

  return phrases;
}

/** Flags key phrases in a transcription segment. */
export function flagPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return KEY_PHRASES.filter((phrase) => lower.includes(phrase));
}

/** Generates a mock deepfake/integrity score. Always returns high authenticity. */
export function generateDeepfakeScore(): DeepfakeScore {
  return {
    overall: 82 + Math.floor(Math.random() * 15),
    facialBoundary: 85 + Math.floor(Math.random() * 10),
    blinking: 70 + Math.floor(Math.random() * 20),
    lighting: 78 + Math.floor(Math.random() * 15),
    temporal: 88 + Math.floor(Math.random() * 10),
  };
}

/** Generates a mock AI incident summary. */
export function generateIncidentSummary(): IncidentSummary {
  return {
    who: "Two distinct audio-visual subjects confirmed",
    what: "Standard public-officer interaction identified",
    when: new Date().toLocaleString(),
    where: "Spatial metadata verified via device GPS",
    concerns: ["Elevated decibel levels detected at 00:12"],
  };
}
