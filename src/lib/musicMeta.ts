/**
 * Background-music track list. Plain data, no audio code — the player just
 * points an <audio preload="none"> element at these files on first play, so
 * nothing is fetched until the user actually presses play.
 *
 * If you rename the files (e.g. after compressing them), update `file` here —
 * that is the only place the filenames live.
 */
export type TrackId = 'piano' | 'chill' | 'study' | 'relax';

export interface MusicTrack {
  id: TrackId;
  /** Filename under public/audio/. */
  file: string;
}

export const TRACKS: MusicTrack[] = [
  { id: 'piano', file: 'alex-morgan-relaxing-piano-study-music-564265.mp3' },
  { id: 'chill', file: 'chill_background-chill-study-15582.mp3' },
  { id: 'study', file: 'maksymmalko-learning-school-study-music-249658.mp3' },
  { id: 'relax', file: 'verclub_music-relaxing-music-571029.mp3' },
];
