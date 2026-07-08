import { useEffect, useRef, useState } from 'react';
import { searchBooks, type BookSearchResult } from '../lib/bookSearch';

interface BookSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user picks a suggestion from the dropdown. */
  onSelect: (result: BookSearchResult) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * A title input with Open Library autocomplete: type at least 3 characters
 * and matching books appear in a dropdown; picking one autofills the caller
 * (title, author, cover). Typing freely without picking works as before.
 */
export default function BookSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  className = '',
  ariaLabel,
}: BookSearchInputProps) {
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchBooks(query, controller.signal);
      if (!controller.signal.aborted) {
        setResults(found);
        setOpen(found.length > 0);
        setSearching(false);
      }
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  const pick = (result: BookSearchResult) => {
    skipNextSearch.current = true; // selecting shouldn't re-trigger a search
    setOpen(false);
    setResults([]);
    onSelect(result);
  };

  return (
    <div className="relative">
      <input
        required={required}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(results.length > 0)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {searching && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-sepia-300 border-t-sepia-700" />
        </span>
      )}
      {open && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-ivory-300 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {results.map((result, index) => (
            <li key={`${result.title}-${index}`} role="option" aria-selected={false}>
              <button
                type="button"
                // mousedown fires before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(result);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-ivory-100"
              >
                {result.coverUrl ? (
                  <img
                    src={result.coverUrl.replace('-L.jpg', '-S.jpg')}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-7 shrink-0 rounded-sm object-cover shadow-sm"
                  />
                ) : (
                  <span className="flex h-10 w-7 shrink-0 items-center justify-center rounded-sm bg-ivory-200 text-xs">
                    📖
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-zinc-800">
                    {result.title}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {result.author}
                    {result.year ? ` · ${result.year}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-ivory-200 px-3 py-1.5 text-right text-[10px] text-zinc-400">
            Haku: Open Library
          </li>
        </ul>
      )}
    </div>
  );
}
