import type { CommunityStats } from '../types';
import { useI18n } from '../i18n';

interface CommunityStatsProps {
  stats: CommunityStats;
}

const medal = (index: number) => ['🥇', '🥈', '🥉'][index] ?? `${index + 1}.`;

export default function CommunityStatsPanel({ stats }: CommunityStatsProps) {
  const { t } = useI18n();

  // Nothing to show if the community is empty (or the views are missing).
  if (stats.lukijat === 0 && stats.kirjat === 0 && stats.suosituimmat.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={t.community.title}
      className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl text-ink-900">{t.community.title}</h2>
        <p className="text-sm text-zinc-500">{t.community.subtitle}</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        {/* Totals */}
        <div className="flex gap-8 sm:pr-8">
          <div>
            <p className="font-serif text-3xl text-ink-900">{stats.lukijat}</p>
            <p className="text-xs uppercase tracking-widest text-sepia-500">
              {t.community.readers}
            </p>
          </div>
          <div>
            <p className="font-serif text-3xl text-ink-900">{stats.kirjat}</p>
            <p className="text-xs uppercase tracking-widest text-sepia-500">
              {t.community.booksRead}
            </p>
          </div>
        </div>

        {/* Top books */}
        {stats.suosituimmat.length > 0 && (
          <div className="border-t border-ivory-300 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">
              {t.community.topBooks}
            </p>
            <ol className="mt-2 space-y-1.5">
              {stats.suosituimmat.map((book, index) => (
                <li key={`${book.kirjan_nimi}-${index}`} className="flex items-baseline gap-2 text-sm">
                  <span className="shrink-0">{medal(index)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-ink-900">{book.kirjan_nimi}</span>
                    {book.kirjoittaja && (
                      <span className="text-zinc-500"> — {book.kirjoittaja}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-sepia-700">
                    {t.community.timesRead(book.lukukerrat)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
