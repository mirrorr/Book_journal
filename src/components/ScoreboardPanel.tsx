import { useState } from 'react';
import type { Profile, Scoreboard, ScoreRow } from '../types';
import { useI18n } from '../i18n';

interface ScoreboardPanelProps {
  scoreboard: Scoreboard;
  profile: Profile | null;
  /** Opens the profile dialog so the user can opt in. */
  onOpenProfile: () => void;
}

type Period = 'monthly' | 'total';

const medal = (index: number) => ['🥇', '🥈', '🥉'][index] ?? `${index + 1}.`;

function ScoreList({ rows, ownName }: { rows: ScoreRow[]; ownName: string | null }) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-400">{t.scoreboard.empty}</p>;
  }
  return (
    <ol className="divide-y divide-ivory-300">
      {rows.map((row, index) => {
        const isOwn =
          ownName !== null && row.kayttajanimi.toLowerCase() === ownName.toLowerCase();
        return (
          <li
            key={row.kayttajanimi}
            className={`flex items-center gap-3 px-2 py-2.5 ${
              isOwn ? 'rounded-lg bg-sepia-100/70' : ''
            }`}
          >
            <span className="w-8 shrink-0 text-center text-sm">{medal(index)}</span>
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                isOwn ? 'font-semibold text-sepia-900' : 'text-zinc-700'
              }`}
            >
              {row.kayttajanimi}
              {isOwn && <span className="ml-1.5 text-xs text-sepia-500">{t.scoreboard.you}</span>}
            </span>
            <span className="shrink-0 text-sm font-medium text-sepia-700">
              {t.scoreboard.books(row.kirjat)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ScoreboardPanel({
  scoreboard,
  profile,
  onOpenProfile,
}: ScoreboardPanelProps) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>('monthly');

  const ownName = profile?.public_profile ? profile.kayttajanimi : null;
  const rows = period === 'monthly' ? scoreboard.monthly : scoreboard.total;

  return (
    <section
      aria-label={t.scoreboard.title}
      className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink-900">{t.scoreboard.title}</h2>
          <p className="text-sm text-zinc-500">{t.scoreboard.subtitle}</p>
        </div>
        <div className="inline-flex rounded-full border border-ivory-300 bg-white p-1 shadow-sm">
          <button
            type="button"
            aria-pressed={period === 'monthly'}
            onClick={() => setPeriod('monthly')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              period === 'monthly'
                ? 'bg-sepia-700 text-ivory-50 shadow'
                : 'text-zinc-500 hover:text-sepia-700'
            }`}
          >
            {t.scoreboard.thisMonth}
          </button>
          <button
            type="button"
            aria-pressed={period === 'total'}
            onClick={() => setPeriod('total')}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              period === 'total'
                ? 'bg-sepia-700 text-ivory-50 shadow'
                : 'text-zinc-500 hover:text-sepia-700'
            }`}
          >
            {t.scoreboard.allTime}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <ScoreList rows={rows} ownName={ownName} />
      </div>

      {!profile?.public_profile && (
        <p className="mt-4 border-t border-ivory-300 pt-4 text-sm text-zinc-500">
          {t.scoreboard.notOnBoard}{' '}
          <button
            onClick={onOpenProfile}
            className="font-medium text-sepia-700 underline-offset-2 transition hover:text-sepia-900 hover:underline"
          >
            {t.scoreboard.joinLink}
          </button>{' '}
          {t.scoreboard.joinNote}
        </p>
      )}
    </section>
  );
}
