/** A book found via the Open Library search API. */
export interface BookSearchResult {
  title: string;
  author: string;
  coverUrl: string;
  year: number | null;
}

interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

/**
 * Search Open Library (free, no API key, CORS-enabled) for books by title.
 * Failures resolve to an empty list — autofill is a convenience, never a blocker.
 */
export async function searchBooks(
  query: string,
  signal?: AbortSignal
): Promise<BookSearchResult[]> {
  const url =
    'https://openlibrary.org/search.json?limit=5&fields=title,author_name,cover_i,first_publish_year&q=' +
    encodeURIComponent(query);
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return [];
    const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
    return (data.docs ?? [])
      .filter((doc) => doc.title)
      .map((doc) => ({
        title: doc.title as string,
        author: doc.author_name?.[0] ?? '',
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : '',
        year: doc.first_publish_year ?? null,
      }));
  } catch {
    return []; // network error or aborted — just show no suggestions
  }
}
