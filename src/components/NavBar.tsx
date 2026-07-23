import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';

interface NavBarProps {
  /** The rewards link is omitted when the user has hidden the feature. */
  showRewards: boolean;
}

// NavLink sets aria-current="page" itself, so no aria-pressed here.
const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500 ${
    isActive ? 'bg-sepia-700 text-ivory-50 shadow' : 'text-zinc-500 hover:text-sepia-700'
  }`;

export default function NavBar({ showRewards }: NavBarProps) {
  const { t } = useI18n();

  return (
    <nav aria-label={t.nav.ariaLabel} className="mb-8 overflow-x-auto">
      <div className="inline-flex rounded-full border border-ivory-300 bg-white p-1 shadow-sm">
        <NavLink to="/" end className={linkClasses}>
          {t.nav.dashboard}
        </NavLink>
        {showRewards && (
          <NavLink to="/palkinnot" className={linkClasses}>
            {t.nav.rewards}
          </NavLink>
        )}
      </div>
    </nav>
  );
}
