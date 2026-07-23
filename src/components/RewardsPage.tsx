import { useState } from 'react';
import type { Book } from '../types';
import CandyJar from './CandyJar';
import TasteBadges from './TasteBadges';
import { setSoundEnabled, soundEnabled } from '../lib/sound';
import { useI18n } from '../i18n';

interface RewardsPageProps {
  books: Book[];
}

export default function RewardsPage({ books }: RewardsPageProps) {
  const { t } = useI18n();
  const [sound, setSound] = useState(soundEnabled);

  const toggleSound = () => {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
  };

  const soundToggle = (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={sound}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ivory-300 bg-white px-4 py-1.5 text-xs font-medium text-sepia-700 shadow-sm transition hover:border-sepia-300 hover:bg-sepia-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
    >
      <span aria-hidden="true">{sound ? '🔊' : '🔇'}</span>
      {sound ? t.rewards.soundOn : t.rewards.soundOff}
    </button>
  );

  return (
    <main className="animate-rise space-y-6">
      <CandyJar books={books} headerAction={soundToggle} />
      <TasteBadges books={books} />
    </main>
  );
}
