/** Format an ISO date (e.g. "2026-05-02") in long form for the given locale. */
export function formatDate(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Month + year label for timelines, e.g. "toukokuu 2026" / "May 2026". */
export function formatMonthYear(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}
