import { useMemo } from 'react';
import type { Book } from '../types';
import { formatMonthYear } from '../lib/format';

interface DashboardStatsProps {
  books: Book[];
}

interface TimelineBucket {
  key: string;
  label: string;
  count: number;
}

function buildTimeline(books: Book[]): TimelineBucket[] {
  const buckets = new Map<string, TimelineBucket>();
  for (const book of books) {
    const key = book.valmistumispaiva.slice(0, 7); // "YYYY-MM"
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, {
        key,
        label: formatMonthYear(`${key}-01`),
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

export default function DashboardStats({ books }: DashboardStatsProps) {
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
      timeline: buildTimeline(books),
    };
  }, [books]);

  if (books.length === 0) return null;

  const maxCount = Math.max(...stats.timeline.map((b) => b.count), 1);

  return (
    <section aria-label="Lukutilastot" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Luetut kirjat" value={String(stats.total)} sublabel="yhteensä päiväkirjassa" />
      <StatCard
        label="Keskiarvio"
        value={stats.average > 0 ? `${stats.average.toFixed(1)} ★` : '–'}
        sublabel="kaikista arvioista"
      />
      <StatCard
        label="Suosittelisin"
        value={`${stats.recommended} / ${stats.total}`}
        sublabel="kirjaa eteenpäin"
      />

      <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-5 shadow-sm sm:col-span-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">
          Lukuhistoria
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
