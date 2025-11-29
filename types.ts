export enum ShiftType {
  SMOOTH = 'Smooth',
  MOOD_SWITCH = 'Mood Switch',
  ENERGY_UP = 'Energy Up',
  RHYTHMIC_BREAKER = 'Rhythmic/Dead-End Breaker',
}

export type PhraseInfo = {
  beatsRemaining: number;
  timeRemainingSeconds: number;
  phraseCount: number;
};

export type CurrentTrack = {
  track_name: string;
  artist: string;
  camelot_key?: string;
  progress_ms: number;
  duration_ms: number;
  timestamp: number;
  isPlaying: boolean;
  audio_features: {
    tempo: number;
    time_signature?: number;
  };
};

export type MatchedTrack = {
  track_name: string;
  artist: string;
  camelot_key: string;
  bpm: number;
  shiftType: ShiftType;
};
