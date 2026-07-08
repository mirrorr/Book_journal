import { useI18n } from '../i18n';

interface StarIconProps {
  filled: boolean;
  className?: string;
}

function StarIcon({ filled, className = 'h-5 w-5' }: StarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.5c.16-.4.88-.4 1.04 0l2.12 5.11 5.52.44c.44.04.61.58.28.87l-4.2 3.6 1.28 5.39c.1.43-.36.76-.74.53L12 16.56l-4.78 2.88c-.38.23-.84-.1-.74-.53l1.28-5.39-4.2-3.6a.5.5 0 0 1 .28-.87l5.52-.44 2.12-5.11Z"
      />
    </svg>
  );
}

interface StarDisplayProps {
  value: number;
  className?: string;
  starClassName?: string;
}

/** Read-only star row for cards and detail views. */
export function StarDisplay({
  value,
  className = '',
  starClassName = 'h-5 w-5',
}: StarDisplayProps) {
  const { t } = useI18n();
  return (
    <div
      className={`flex items-center gap-0.5 text-sepia-500 ${className}`}
      role="img"
      aria-label={t.stars.ratingLabel(value)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} filled={star <= value} className={starClassName} />
      ))}
    </div>
  );
}

interface StarPickerProps {
  value: number;
  onChange: (value: number) => void;
}

/** Interactive star-rating picker for the journal form. */
export function StarPicker({ value, onChange }: StarPickerProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t.stars.pickLabel}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t.stars.starsLabel(star)}
          onClick={() => onChange(star === value ? 0 : star)}
          className={`rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500 ${
            star <= value ? 'text-sepia-500' : 'text-zinc-300 hover:text-sepia-300'
          }`}
        >
          <StarIcon filled={star <= value} className="h-8 w-8" />
        </button>
      ))}
      <span className="ml-2 text-sm text-zinc-500">{value > 0 ? `${value} / 5` : '–'}</span>
    </div>
  );
}
