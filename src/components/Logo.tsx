/**
 * Lukumaku wordmark, inlined from the brand package so it stays crisp at any
 * size. Uses live text in Spectral 600 (loaded in index.html); the ink color
 * follows `currentColor` so it adapts to context, while the two accent dots
 * keep their fixed brand colors (raspberry #c25f57, pistachio #5f9d63).
 */
export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 928 285"
      className={className}
      role="img"
      aria-label="Lukumaku"
    >
      <text
        x="20"
        y="250"
        fontFamily="Spectral, Georgia, serif"
        fontWeight="600"
        fontSize="200"
        letterSpacing="-3"
        fill="currentColor"
      >
        lukumaku
      </text>
      <circle cx="135.9" cy="24" r="16" fill="#c25f57" />
      <circle cx="856.7" cy="24" r="16" fill="#5f9d63" />
    </svg>
  );
}
