import { useMemo } from 'react';
import type { Book } from '../types';
import { formatMonthYear } from '../lib/format';
import { useI18n } from '../i18n';

interface DashboardStatsProps {
  books: Book[];
  /** Yearly reading goal from the profile; 0 or undefined = no goal set. */
  lukutavoite?: number;
}

interface TimelineBucket {
  key: string;
  label: string;
  count: number;
}

function buildTimeline(books: Book[], locale: string): TimelineBucket[] {
  const buckets = new Map<string, TimelineBucket>();
  for (const book of books) {
    const key = book.valmistumispaiva.slice(0, 7); // "YYYY-MM"
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, {
        key,
        label: formatMonthYear(`${key}-01`, locale),
        count: 1,
      });
    }
  }
  return [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6);
}

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
}

function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">{label}</p>
      <p className="mt-2 font-serif text-4xl text-ink-900">{value}</p>
      {sublabel && <p className="mt-1 text-sm text-zinc-500">{sublabel}</p>}
    </div>
  );
}

function ReadingGoalCard({ books, goal }: { books: Book[]; goal: number }) {
  const { t } = useI18n();
  const year = String(new Date().getFullYear());
  const readThisYear = books.filter((b) => b.valmistumispaiva.startsWith(year)).length;
  const progress = Math.min(100, (readThisYear / goal) * 100);
  const done = readThisYear >= goal;

  return (
    <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-5 shadow-sm sm:col-span-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">
          {t.stats.goalTitle(year)}
        </p>
        <p className="text-sm text-zinc-500">
          {done ? t.stats.goalReached : t.stats.goalRemaining(goal - readThisYear)}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <p className="shrink-0 font-serif text-3xl text-ink-900">
          {readThisYear} <span className="text-xl text-zinc-400">/ {goal}</span>
        </p>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-ivory-200">
          <div
            className={`h-full rounded-full transition-all ${
              done ? 'bg-sepia-900' : 'bg-sepia-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats({ books, lukutavoite = 0 }: DashboardStatsProps) {
  const { t, locale } = useI18n();
  const stats = useMemo(() => {
    const total = books.length;
    const rated = books.filter((b) => b.arvio > 0);
    const average =
      rated.length > 0
        ? rated.reduce((sum, b) => sum + b.arvio, 0) / rated.length
        : 0;
    const recommended = books.filter((b) => b.suosittelen).length;
    return {
      total,
      average,
      recommended,
      timeline: buildTimeline(books, locale),
    };
  }, [books, locale]);

  if (books.length === 0 && lukutavoite === 0) return null;

  const maxCount = Math.max(...stats.timeline.map((b) => b.count), 1);

  return (
    <section aria-label={t.stats.ariaLabel} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {lukutavoite > 0 && <ReadingGoalCard books={books} goal={lukutavoite} />}
      <StatCard label={t.stats.booksRead} value={String(stats.total)} sublabel={t.stats.booksReadSub} />
      <StatCard
        label={t.stats.average}
        value={stats.average > 0 ? `${stats.average.toFixed(1)} ★` : '–'}
        sublabel={t.stats.averageSub}
      />
      <StatCard
        label={t.stats.wouldRecommend}
        value={`${stats.recommended} / ${stats.total}`}
        sublabel={t.stats.wouldRecommendSub}
      />

      <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-5 shadow-sm sm:col-span-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">
          {t.stats.history}
        </p>
        <ul className="mt-4 space-y-2.5">
          {stats.timeline.map((bucket) => (
            <li key={bucket.key} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm capitalize text-zinc-600">{bucket.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ivory-200">
                <div
                  className="h-full rounded-full bg-sepia-500 transition-all"
                  style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm font-medium text-sepia-700">
                {bucket.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
