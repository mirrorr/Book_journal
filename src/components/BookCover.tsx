import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

interface BookCoverProps {
  title: string;
  author: string;
  url?: string;
  /** Controls the cover size, e.g. "h-28 w-20" on cards, "h-64 w-44" in detail. */
  sizeClasses: string;
  className?: string;
  /** Reports whether the image URL loaded (true) or failed (false). */
  onLoadResult?: (ok: boolean) => void;
}

/**
 * A book cover with a spine highlight and page edge. Shows the image when a
 * URL is provided (falling back gracefully if it fails to load); otherwise
 * renders a generated "cloth-bound" default cover with the title and author.
 */
export default function BookCover({
  title,
  author,
  url,
  sizeClasses,
  className = '',
  onLoadResult,
}: BookCoverProps) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  // A newly saved URL should get a fresh chance even after an earlier failure.
  useEffect(() => setFailed(false), [url]);

  const showImage = Boolean(url) && !failed;

  return (
    <div
      className={`book-cover relative shrink-0 overflow-hidden rounded-r-lg rounded-l-sm shadow-md ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          // Many book-cover hosts block hotlinking based on the Referer
          // header; sending none makes far more image URLs work.
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(true);
            onLoadResult?.(false);
          }}
          onLoad={() => onLoadResult?.(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-between bg-gradient-to-br from-sepia-500 via-sepia-700 to-sepia-900 px-2 py-3 text-center">
          <div className="h-px w-3/4 bg-ivory-100/40" />
          <div className="min-h-0 overflow-hidden px-1">
            <p className="line-clamp-4 font-serif text-[0.6em] font-semibold leading-snug text-ivory-100 [font-size:min(0.8rem,1em)]">
              {title || t.cover.untitled}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.55em] tracking-wide text-ivory-100/70 [font-size:min(0.65rem,1em)]">
              {author}
            </p>
          </div>
          <div className="h-px w-3/4 bg-ivory-100/40" />
        </div>
      )}
      {/* Spine shadow + highlight for a physical-book feel */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-black/25 via-white/10 to-transparent" />
      {/* Page edge on the right */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[3%] bg-gradient-to-l from-ivory-100/60 to-transparent" />
    </div>
  );
}
