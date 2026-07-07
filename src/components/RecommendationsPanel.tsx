import { useState } from 'react';
import type { Recommendation } from '../types';
import { StarDisplay } from './StarRating';
import BookCover from './BookCover';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  /** Lowercased "title|author" keys already on the wishlist or in the journal. */
  existingKeys: Set<string>;
  onAddToWishlist: (rec: Recommendation) => Promise<void>;
}

export const recommendationKey = (item: { kirjan_nimi: string; kirjoittaja: string }) =>
  `${item.kirjan_nimi}|${item.kirjoittaja}`.toLowerCase();

export default function RecommendationsPanel({
  recommendations,
  existingKeys,
  onAddToWishlist,
}: RecommendationsPanelProps) {
  const [addingKey, setAddingKey] = useState<string | null>(null);

  if (recommendations.length === 0) return null;

  const handleAdd = async (rec: Recommendation) => {
    const key = recommendationKey(rec);
    setAddingKey(key);
    try {
      await onAddToWishlist(rec);
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <section aria-label="Muiden lukijoiden suositukset">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl text-ink-900">Muut lukijat suosittelevat</h2>
        <p className="text-sm text-zinc-500">Vain kirja, arvio ja suosittelun syy — ei muuta</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => {
          const key = recommendationKey(rec);
          const alreadyKnown = existingKeys.has(key);
          return (
            <article
              key={key}
              className="flex gap-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-sm"
            >
              <BookCover
                title={rec.kirjan_nimi}
                author={rec.kirjoittaja}
                sizeClasses="h-24 w-16"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <StarDisplay value={rec.arvio} starClassName="h-3.5 w-3.5" />
                <h3 className="mt-1 truncate font-serif text-lg leading-snug text-ink-900">
                  {rec.kirjan_nimi}
                </h3>
                <p className="truncate text-xs font-medium tracking-wide text-sepia-700">
                  {rec.kirjoittaja}
                </p>
                {rec.suosittelu_syy && (
                  <p className="mt-1.5 line-clamp-2 text-xs italic leading-relaxed text-zinc-500">
                    ”{rec.suosittelu_syy}”
                  </p>
                )}
                <div className="mt-auto pt-2">
                  <button
                    onClick={() => void handleAdd(rec)}
                    disabled={alreadyKnown || addingKey === key}
                    className="rounded-full border border-sepia-300 px-3 py-1 text-xs font-medium text-sepia-700 transition hover:bg-sepia-100 disabled:cursor-default disabled:border-ivory-300 disabled:text-zinc-400 disabled:hover:bg-transparent"
                  >
                    {alreadyKnown
                      ? '✓ Jo listallasi'
                      : addingKey === key
                        ? 'Lisätään…'
                        : '+ Lukulistalle'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
