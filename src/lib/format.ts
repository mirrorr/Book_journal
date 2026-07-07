/** Format an ISO date (e.g. "2026-05-02") as Finnish long form, e.g. "2. toukokuuta 2026". */
export function formatFinnishDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Month + year label for timelines, e.g. "toukokuu 2026". */
export function formatMonthYear(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fi-FI', { month: 'long', year: 'numeric' }).format(date);
}
