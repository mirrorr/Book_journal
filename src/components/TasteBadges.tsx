import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Book } from '../types';
import { evaluateBadges, type BadgeId, type BadgeState, type CandyShape } from '../lib/rewards';
import { formatDate } from '../lib/format';
import { playBadgeUnlock } from '../lib/sound';
import { useI18n } from '../i18n';

const BADGES_RESET_KEY = 'lukumaku.rewards.badgesResetAt.v1';
const BADGES_SEEN_KEY = 'lukumaku.rewards.seenBadges.v1';
/** How long the "new badge" toast stays up. */
const TOAST_MS = 8000;

function readSeen(): BadgeId[] {
  try {
    const raw = localStorage.getItem(BADGES_SEEN_KEY);
    return raw ? (JSON.parse(raw) as BadgeId[]) : [];
  } catch {
    return [];
  }
}

/** Badge glyph: a candy shape, filled when unlocked and outlined when not. */
function BadgeGlyph({
  shape,
  color,
  unlocked,
  className = 'h-10 w-10',
}: {
  shape: CandyShape;
  color: string;
  unlocked: boolean;
  className?: string;
}) {
  const fill = unlocked ? color : 'none';
  const stroke = unlocked ? 'none' : 'var(--color-sepia-300)';
  const strokeWidth = unlocked ? 0 : 2;

  return (
    <svg viewBox="-16 -16 32 32" className={className} aria-hidden="true">
      {shape === 'jelly' && (
        <rect x={-11} y={-8} width={22} height={16} rx={6} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {shape === 'lolly' && (
        <>
          <rect x={-1.2} y={0} width={2.4} height={12} rx={1.2} fill={unlocked ? 'var(--color-sepia-300)' : 'none'} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={0} cy={-3} r={9} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}
      {shape === 'stick' && (
        <rect x={-12} y={-5.5} width={24} height={11} rx={5.5} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {shape === 'drop' && (
        <circle cx={0} cy={0} r={10} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {unlocked && <circle cx={-3.5} cy={-4} r={2.4} fill="#fff" opacity={0.4} />}
    </svg>
  );
}

/** Prominent announcement so a new badge can't slip past unnoticed. */
function NewBadgeToast({
  badges,
  onDismiss,
}: {
  badges: BadgeState[];
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const shown = badges.slice(0, 3);
  const extra = badges.length - shown.length;

  // Rendered into <body>: an ancestor with a transform (RewardsPage's
  // animate-rise) would otherwise become the containing block for `fixed`,
  // stranding the toast at the bottom of the page instead of the viewport.
  return createPortal(
    <div
      className="animate-rise fixed bottom-6 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-sepia-300 bg-ivory-50 p-5 shadow-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-xl text-sepia-900">
          🎉 {t.rewards.newBadgeTitle(badges.length)}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.common.close}
          className="rounded-full p-1 text-zinc-400 transition hover:bg-ivory-200 hover:text-zinc-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {shown.map((badge) => (
          <li key={badge.id} className="flex items-center gap-3">
            <span className="animate-badge-unlock shrink-0">
              <BadgeGlyph shape={badge.icon} color={badge.color} unlocked className="h-9 w-9" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-base text-ink-900">
                {t.rewards.badges[badge.id].title}
              </span>
              <span className="block truncate text-xs text-zinc-500">
                {t.rewards.badges[badge.id].desc}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {extra > 0 && (
        <p className="mt-2 text-xs font-medium text-sepia-700">
          {t.rewards.andMoreBadges(extra)}
        </p>
      )}
    </div>,
    document.body
  );
}

interface TasteBadgesProps {
  books: Book[];
}

export default function TasteBadges({ books }: TasteBadgesProps) {
  const { t, locale } = useI18n();
  // Only entries created after this timestamp count, so the collection can be
  // started over. Kept in localStorage: it is a personal, per-device choice.
  const [resetAt, setResetAt] = useState<string | null>(() =>
    localStorage.getItem(BADGES_RESET_KEY)
  );
  const badges = useMemo(() => evaluateBadges(books, resetAt), [books, resetAt]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const [newBadges, setNewBadges] = useState<BadgeState[]>([]);
  const newIds = useMemo(() => new Set(newBadges.map((b) => b.id)), [newBadges]);

  // Announce anything unlocked since the user last looked. Recording the
  // unlocked set here is what stops a repeat announcement: StrictMode's second
  // effect run (and every later render) reads back the list just written and
  // finds nothing fresh. A ref guard must NOT be used for this — it would
  // latch on the first run and silence every badge earned afterwards.
  useEffect(() => {
    const seen = readSeen();
    const unlockedIds = badges.filter((b) => b.unlocked).map((b) => b.id);
    const fresh = badges.filter((b) => b.unlocked && !seen.includes(b.id));
    try {
      localStorage.setItem(BADGES_SEEN_KEY, JSON.stringify(unlockedIds));
    } catch {
      /* storage unavailable — the toast just repeats next time */
    }
    if (fresh.length === 0) return;
    setNewBadges(fresh);
    playBadgeUnlock();
  }, [badges]);

  useEffect(() => {
    if (newBadges.length === 0) return;
    const id = window.setTimeout(() => setNewBadges([]), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [newBadges]);

  const handleReset = () => {
    if (!window.confirm(t.rewards.resetConfirm)) return;
    const now = new Date().toISOString();
    localStorage.setItem(BADGES_RESET_KEY, now);
    // Forget what was announced, so re-earning a badge celebrates again.
    // Nothing is unlocked straight after a reset, so this can't self-toast.
    localStorage.removeItem(BADGES_SEEN_KEY);
    setNewBadges([]);
    setResetAt(now);
  };

  const handleUndo = () => {
    localStorage.removeItem(BADGES_RESET_KEY);
    setResetAt(null);
  };

  return (
    <section
      aria-label={t.rewards.badgesTitle}
      className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl text-ink-900">{t.rewards.badgesTitle}</h2>
        <p className="text-sm text-zinc-500">{t.rewards.badgesSubtitle}</p>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-sepia-700">
          {t.rewards.badgesProgress(unlockedCount, badges.length)}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-ivory-300 px-3 py-1 text-xs font-medium text-zinc-500 transition hover:border-sepia-300 hover:text-sepia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
        >
          {t.rewards.resetBadges}
        </button>
      </div>

      {resetAt && (
        <p className="mt-2 text-xs text-zinc-400">
          {t.rewards.resetNote(formatDate(resetAt.slice(0, 10), locale))}{' '}
          <button
            type="button"
            onClick={handleUndo}
            className="font-medium text-sepia-700 underline-offset-2 transition hover:underline"
          >
            {t.rewards.undoReset}
          </button>
        </p>
      )}

      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((badge, index) => {
          const label = t.rewards.badges[badge.id];
          const isNew = newIds.has(badge.id);
          return (
            <li
              key={badge.id}
              style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
              className={`animate-rise relative flex flex-col items-center rounded-xl border p-4 text-center transition ${
                isNew
                  ? 'border-sepia-500 bg-white shadow-md ring-2 ring-sepia-300'
                  : badge.unlocked
                    ? 'border-sepia-300 bg-white shadow-sm'
                    : 'border-dashed border-ivory-300 bg-ivory-100'
              }`}
            >
              {isNew && (
                <span className="absolute -top-2 right-2 rounded-full bg-sepia-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ivory-50 shadow">
                  {t.rewards.newBadgeRibbon}
                </span>
              )}
              <span className={isNew ? 'animate-badge-unlock' : ''}>
                <BadgeGlyph shape={badge.icon} color={badge.color} unlocked={badge.unlocked} />
              </span>
              <span
                className={`mt-2 font-serif text-base leading-snug ${
                  badge.unlocked ? 'text-ink-900' : 'text-zinc-400'
                }`}
              >
                {label.title}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-zinc-500">{label.desc}</span>
              {!badge.unlocked && (
                <span className="mt-2 text-[10px] uppercase tracking-widest text-zinc-400">
                  {t.rewards.locked}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {newBadges.length > 0 && (
        <NewBadgeToast badges={newBadges} onDismiss={() => setNewBadges([])} />
      )}
    </section>
  );
}
