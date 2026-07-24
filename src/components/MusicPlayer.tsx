import { useEffect, useRef, useState } from 'react';
import { TRACKS } from '../lib/musicMeta';
import { useI18n } from '../i18n';

const TRACK_KEY = 'lukumaku.music.track';
const VOLUME_KEY = 'lukumaku.music.volume';

function initialIndex(): number {
  const saved = localStorage.getItem(TRACK_KEY);
  const i = TRACKS.findIndex((t) => t.id === saved);
  return i >= 0 ? i : 0;
}

function initialVolume(): number {
  const v = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(v) && v > 0 ? Math.min(1, v) : 0.6;
}

export default function MusicPlayer() {
  const { t } = useI18n();
  // Created lazily on first play so nothing is fetched on page load.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedIndex = useRef<number>(-1);

  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  // Pause on unmount so audio never outlives the app.
  useEffect(() => () => audioRef.current?.pause(), []);

  const getAudio = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'none'; // no network until a track is actually chosen
      audio.loop = true;
      audio.volume = volume;
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('play', () => setPlaying(true));
      audioRef.current = audio;
    }
    return audioRef.current;
  };

  const playIndex = async (i: number) => {
    const audio = getAudio();
    setError(false);
    if (loadedIndex.current !== i) {
      audio.src = `/audio/${TRACKS[i].file}`;
      loadedIndex.current = i;
    }
    try {
      await audio.play();
    } catch {
      // Autoplay policy or a missing/blocked file — surface it quietly.
      setError(true);
      setPlaying(false);
    }
  };

  const toggle = () => {
    const audio = getAudio();
    if (playing) audio.pause();
    else void playIndex(index);
  };

  const step = (delta: number) => {
    const next = (index + delta + TRACKS.length) % TRACKS.length;
    setIndex(next);
    localStorage.setItem(TRACK_KEY, TRACKS[next].id);
    if (playing || loadedIndex.current !== -1) void playIndex(next);
  };

  const trackName = t.music.tracks[TRACKS[index].id];

  // Collapsed: a single unobtrusive button.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.music.label}
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-ivory-300 bg-ivory-50 text-lg shadow-lg transition hover:bg-sepia-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
      >
        <span aria-hidden="true">{playing ? '🎵' : '🎧'}</span>
        {playing && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-candy-pistachio" />
        )}
      </button>
    );
  }

  return (
    <section
      aria-label={t.music.label}
      className="fixed bottom-5 left-5 z-40 w-64 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">
          {t.music.label}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.music.close}
          className="rounded-full p-1 text-zinc-400 transition hover:bg-ivory-200 hover:text-zinc-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
      </div>

      <p className="mt-2 truncate font-serif text-lg text-ink-900">{trackName}</p>
      {error && <p className="mt-1 text-xs text-red-600">{t.music.unavailable}</p>}

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t.music.prev}
          className="rounded-full p-2 text-sepia-700 transition hover:bg-sepia-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M6 5h2v14H6zM20 5v14L9 12z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t.music.pause : t.music.play}
          aria-pressed={playing}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-sepia-700 text-ivory-50 shadow-sm transition hover:bg-sepia-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M7 5v14l12-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={t.music.next}
          className="rounded-full p-2 text-sepia-700 transition hover:bg-sepia-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
          </svg>
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2">
        <span aria-hidden="true" className="text-xs">🔈</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label={t.music.volume}
          className="h-1 flex-1 cursor-pointer accent-sepia-700"
        />
      </label>
    </section>
  );
}
